use portable_pty::{Child, MasterPty, PtySize};
use std::io::Write;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

pub struct PtyInstance {
    pub id: String,
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn Child + Send + Sync>,
    alive: Arc<AtomicBool>,
    pub cols: u16,
    pub rows: u16,
}

impl PtyInstance {
    pub fn new(
        id: String,
        master: Box<dyn MasterPty + Send>,
        writer: Box<dyn Write + Send>,
        child: Box<dyn Child + Send + Sync>,
        alive: Arc<AtomicBool>,
        cols: u16,
        rows: u16,
    ) -> Self {
        Self { id, master, writer, child, alive, cols, rows }
    }

    pub fn write_data(&mut self, data: &[u8]) -> anyhow::Result<()> {
        self.writer.write_all(data)?;
        self.writer.flush()?;
        Ok(())
    }

    pub fn resize(&self, cols: u16, rows: u16) -> anyhow::Result<()> {
        self.master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;
        Ok(())
    }

    pub fn kill(&mut self) {
        self.alive.store(false, std::sync::atomic::Ordering::Relaxed);
        let _ = self.child.kill();
    }
}

impl Drop for PtyInstance {
    fn drop(&mut self) {
        self.kill();
    }
}
