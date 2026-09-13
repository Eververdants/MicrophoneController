//! Endpoint hotplug notifications.
//!
//! Plugging in a headset, or Windows deciding to switch default device, is
//! invisible to a poller that only looks at one endpoint. `IMMNotificationClient`
//! is the push half of Core Audio: the system calls back whenever the device
//! set or a default changes, and the UI can then re-read the list.
//!
//! Apartment note: the callback object is registered from a thread that lives in
//! the multithreaded apartment and never returns. Registering from a
//! single-threaded apartment would make COM marshal every callback back to that
//! apartment, where a thread without a message pump would never deliver them.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use windows::core::{implement, PCWSTR};
use windows::Win32::Foundation::PROPERTYKEY;
use windows::Win32::Media::Audio::{
    EDataFlow, ERole, IMMDeviceEnumerator, IMMNotificationClient, IMMNotificationClient_Impl,
    MMDeviceEnumerator, DEVICE_STATE,
};
use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED};

/// How long to wait for the notification burst to settle. A single plug event
/// arrives as several callbacks; re-enumerating per callback would activate
/// every endpoint several times over.
const DEBOUNCE: Duration = Duration::from_millis(300);

#[implement(IMMNotificationClient)]
struct DeviceWatcher {
    app: AppHandle,
    generation: Arc<AtomicU64>,
}

impl DeviceWatcher {
    /// Coalesce a burst of callbacks into one refresh signal.
    fn signal(&self) {
        let claimed = self.generation.fetch_add(1, Ordering::SeqCst) + 1;
        let generation = Arc::clone(&self.generation);
        let app = self.app.clone();
        let _ = std::thread::Builder::new()
            .name("mc-device-debounce".into())
            .spawn(move || {
                std::thread::sleep(DEBOUNCE);
                // A newer callback landed meanwhile — that one will emit.
                if generation.load(Ordering::SeqCst) == claimed {
                    let _ = app.emit("audio:devices-changed", ());
                }
            });
    }
}

impl IMMNotificationClient_Impl for DeviceWatcher_Impl {
    fn OnDeviceStateChanged(&self, _device_id: &PCWSTR, _new_state: DEVICE_STATE) -> windows::core::Result<()> {
        self.signal();
        Ok(())
    }

    fn OnDeviceAdded(&self, _device_id: &PCWSTR) -> windows::core::Result<()> {
        self.signal();
        Ok(())
    }

    fn OnDeviceRemoved(&self, _device_id: &PCWSTR) -> windows::core::Result<()> {
        self.signal();
        Ok(())
    }

    fn OnDefaultDeviceChanged(
        &self,
        _flow: EDataFlow,
        _role: ERole,
        _default_device_id: &PCWSTR,
    ) -> windows::core::Result<()> {
        self.signal();
        Ok(())
    }

    fn OnPropertyValueChanged(
        &self,
        _device_id: &PCWSTR,
        _key: &PROPERTYKEY,
    ) -> windows::core::Result<()> {
        self.signal();
        Ok(())
    }
}

/// Register the watcher on a dedicated thread that stays parked for the
/// lifetime of the process.
pub fn start(app: AppHandle) -> Result<(), String> {
    // The handle is dropped on purpose: the thread parks forever, and the
    // interfaces it owns must outlive this call.
    std::thread::Builder::new()
        .name("mc-device-watch".into())
        .spawn(move || {
            unsafe {
                let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
            }

            let enumerator: IMMDeviceEnumerator =
                match unsafe { CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL) } {
                    Ok(e) => e,
                    Err(e) => {
                        log::warn!("device watcher: enumerator unavailable: {e}");
                        return;
                    }
                };

            let watcher: IMMNotificationClient = DeviceWatcher {
                app,
                generation: Arc::new(AtomicU64::new(0)),
            }
            .into();

            if let Err(e) = unsafe { enumerator.RegisterEndpointNotificationCallback(&watcher) } {
                log::warn!("device watcher: registration rejected: {e}");
                return;
            }
            log::info!("device watcher: listening for endpoint changes");

            // Park forever: dropping `enumerator` or `watcher` here would
            // silently deregister the callback.
            let (_tx, rx) = std::sync::mpsc::channel::<()>();
            let _ = rx.recv();
        })
        .map_err(|e| e.to_string())?;
    Ok(())
}
