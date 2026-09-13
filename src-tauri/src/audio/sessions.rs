//! Which applications are currently holding the microphone.
//!
//! Windows shows a "microphone in use" indicator in the tray for exactly this
//! reason: a muted-looking device and a device someone else is recording from
//! are very different situations, and neither the mute flag nor the volume
//! level tells them apart.
//!
//! The sessions of a capture endpoint are enumerated through
//! `IAudioSessionManager2`. Each active one is resolved to a process image name
//! for display.

use super::win::resolve_device;
use windows::core::Interface;
use windows::Win32::Foundation::{CloseHandle, HANDLE};
use windows::Win32::Media::Audio::{
    IAudioSessionControl2, IAudioSessionManager2, AudioSessionStateActive,
};
use windows::Win32::System::Com::CLSCTX_ALL;
use windows::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
};

/// Base image names of the processes with an active capture session on
/// `device_id` (`None` = the system default), excluding this process.
///
/// Best-effort by design: a session can end between enumeration and lookup, and
/// an elevated process cannot be opened from here. Those are skipped rather
/// than failing the whole call.
pub fn active_processes(device_id: Option<&str>) -> Result<Vec<String>, String> {
    let dev = resolve_device(device_id)?;
    // SAFETY: every call below goes through a COM interface obtained by
    // activating the endpoint on this thread; the apartment was initialised by
    // `resolve_device`, and each returned value is checked before use.
    unsafe {
        let manager: IAudioSessionManager2 = dev
            .Activate(CLSCTX_ALL, None)
            .map_err(|e| format!("Activate(IAudioSessionManager2): {e}"))?;
        let sessions = manager
            .GetSessionEnumerator()
            .map_err(|e| format!("GetSessionEnumerator: {e}"))?;
        let count = sessions.GetCount().map_err(|e| format!("GetCount: {e}"))?;

        let own_pid = std::process::id();
        let mut names: Vec<String> = Vec::new();

        for index in 0..count {
            let Ok(control) = sessions.GetSession(index) else {
                continue;
            };
            let Ok(state) = control.GetState() else {
                continue;
            };
            if state != AudioSessionStateActive {
                continue;
            }
            let Ok(control2) = control.cast::<IAudioSessionControl2>() else {
                continue;
            };
            // S_OK means "this is the system sounds session" — never a
            // microphone user, and not tied to a process.
            if control2.IsSystemSoundsSession() == windows::core::HRESULT(0) {
                continue;
            }
            let Ok(pid) = control2.GetProcessId() else {
                continue;
            };
            if pid == 0 || pid == own_pid {
                continue;
            }
            let Some(name) = process_name(pid) else {
                continue;
            };
            if !names.iter().any(|n| n.eq_ignore_ascii_case(&name)) {
                names.push(name);
            }
        }

        names.sort();
        Ok(names)
    }
}

fn process_name(pid: u32) -> Option<String> {
    unsafe {
        let handle: HANDLE = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
        let mut buffer = [0u16; 512];
        let mut length = buffer.len() as u32;
        let result = QueryFullProcessImageNameW(
            handle,
            PROCESS_NAME_WIN32,
            windows::core::PWSTR(buffer.as_mut_ptr()),
            &mut length,
        );
        let _ = CloseHandle(handle);
        result.ok()?;

        let path = String::from_utf16_lossy(&buffer[..length as usize]);
        let file = path.rsplit(['\\', '/']).next()?.trim();
        if file.is_empty() {
            return None;
        }
        Some(file.strip_suffix(".exe").unwrap_or(file).to_string())
    }
}
