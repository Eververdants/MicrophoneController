//! Default-endpoint switching.
//!
//! Windows ships no public API for changing the default audio endpoint — the
//! Sound control panel does it through `IPolicyConfig`, a COM interface that
//! was never given a header or documentation. It is nonetheless stable and the
//! only in-process way to do this, so it is declared here by hand.
//!
//! Two details matter:
//!
//! * The vtable order is load-bearing. `SetDefaultEndpoint` is the 11th method
//!   after the `IUnknown` trio; every method before it is declared — with
//!   deliberately opaque parameter types, since they are never called — purely
//!   to keep the offsets right.
//! * The class exposes itself per role, and Windows keeps three separate
//!   defaults (console, multimedia, communications). A switch that only moved
//!   the console default would leave Teams and Discord on the old device, so
//!   all three are set.

// `#[interface]` mirrors the COM method names verbatim — they are PascalCase by
// definition, and renaming them to satisfy the lint would break the vtable.
#![allow(non_snake_case)]

use windows::core::{interface, IUnknown, IUnknown_Vtbl, HRESULT, HSTRING, PCWSTR};
use windows::Win32::Media::Audio::{eCommunications, eConsole, eMultimedia, ERole};
use windows::Win32::System::Com::{CoCreateInstance, CLSCTX_ALL};

#[interface("f8679f50-850a-41cf-9c72-430f290290c8")]
unsafe trait IPolicyConfig: IUnknown {
    fn GetMixFormat(&self, deviceid: PCWSTR, format: *mut *mut core::ffi::c_void) -> HRESULT;
    fn GetDeviceFormat(
        &self,
        deviceid: PCWSTR,
        default: i32,
        format: *mut *mut core::ffi::c_void,
    ) -> HRESULT;
    fn ResetDeviceFormat(&self, deviceid: PCWSTR) -> HRESULT;
    fn SetDeviceFormat(
        &self,
        deviceid: PCWSTR,
        endpoint: *mut core::ffi::c_void,
        mix: *mut core::ffi::c_void,
    ) -> HRESULT;
    fn GetProcessingPeriod(
        &self,
        deviceid: PCWSTR,
        default: i32,
        default_period: *mut i64,
        minimum_period: *mut i64,
    ) -> HRESULT;
    fn SetProcessingPeriod(&self, deviceid: PCWSTR, period: *mut i64) -> HRESULT;
    fn GetShareMode(&self, deviceid: PCWSTR, mode: *mut core::ffi::c_void) -> HRESULT;
    fn SetShareMode(&self, deviceid: PCWSTR, mode: *mut core::ffi::c_void) -> HRESULT;
    fn GetPropertyValue(
        &self,
        deviceid: PCWSTR,
        key: *const core::ffi::c_void,
        value: *mut core::ffi::c_void,
    ) -> HRESULT;
    fn SetPropertyValue(
        &self,
        deviceid: PCWSTR,
        key: *const core::ffi::c_void,
        value: *const core::ffi::c_void,
    ) -> HRESULT;
    fn SetDefaultEndpoint(&self, deviceid: PCWSTR, role: ERole) -> HRESULT;
    fn SetEndpointVisibility(&self, deviceid: PCWSTR, visible: i32) -> HRESULT;
}

// CLSID_PolicyConfigClient = {870af99c-171d-4f9e-af0d-e63df40c2bc9}
const CLSID_POLICY_CONFIG_CLIENT: windows::core::GUID =
    windows::core::GUID::from_u128(0x870af99c_171d_4f9e_af0d_e63df40c2bc9);

pub fn set_default_endpoint(device_id: &str) -> Result<(), String> {
    super::win::ensure_com();

    let client: IPolicyConfig =
        unsafe { CoCreateInstance(&CLSID_POLICY_CONFIG_CLIENT, None, CLSCTX_ALL) }
            .map_err(|e| format!("CoCreateInstance(IPolicyConfig): {e}"))?;

    let wide = HSTRING::from(device_id);
    let id = PCWSTR(wide.as_ptr());

    for role in [eConsole, eMultimedia, eCommunications] {
        unsafe { client.SetDefaultEndpoint(id, role) }
            .ok()
            .map_err(|e| format!("SetDefaultEndpoint(role {}): {e}", role.0))?;
    }
    Ok(())
}
