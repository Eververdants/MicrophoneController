//! Tauri command handlers, one module per domain.
//!
//! Everything reachable from the frontend is registered in `main.rs`; this
//! module tree only groups the implementations.

pub mod audio;
pub mod config;
pub mod osd;
pub mod window;
