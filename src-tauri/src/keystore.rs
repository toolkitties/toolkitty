//! Persistent storage for private keys.

use std::fs::{self, File};
use std::io::prelude::*;
use std::os::unix::fs::PermissionsExt;
use std::path::Path;

use anyhow::{Context, Result};
use p2panda_core::PrivateKey;

/// Storage and retrieval trait for an Ed25519 private key.
pub trait KeyStore {
    /// Save the hex-encoded private key at the given path.
    fn save(&self, path: &Path) -> Result<()>;

    /// Load the private key from file at the given path.
    fn load(path: &Path) -> Result<PrivateKey>;

    /// Load the private key from file at the given path if it exists.
    /// Otherise create a new, random private key, save it to file and
    /// return it.
    fn load_or_create_new(path: &Path) -> Result<PrivateKey>;
}

impl KeyStore for PrivateKey {
    fn save(&self, path: &Path) -> Result<()> {
        let encoded_private_key = &self.to_hex();

        fs::create_dir_all(
            path.parent()
                .context("failed to get parent directory of key store path")?,
        )?;
        let mut file = File::create(path)?;
        file.write_all(encoded_private_key.as_bytes())?;
        file.sync_all()?;

        let mut permissions = file.metadata()?.permissions();
        permissions.set_mode(0o600);
        fs::set_permissions(path, permissions)?;

        Ok(())
    }

    fn load(path: &Path) -> Result<Self> {
        let mut file = File::open(path)?;
        let mut contents = String::new();
        file.read_to_string(&mut contents)?;

        let private_key_bytes = hex::decode(contents)?;
        let private_key_bytes_array: [u8; 32] = private_key_bytes.as_slice().try_into()?;
        let private_key = PrivateKey::from_bytes(&private_key_bytes_array);

        Ok(private_key)
    }

    fn load_or_create_new(path: &Path) -> Result<Self> {
        let private_key = if let Ok(private_key) = Self::load(path) {
            private_key
        } else {
            let private_key = PrivateKey::new();
            Self::save(&private_key, path)?;
            private_key
        };

        Ok(private_key)
    }
}

#[cfg(test)]
mod tests {
    use p2panda_core::PrivateKey;
    use tempfile::tempdir;

    use super::KeyStore;

    #[test]
    fn load_and_save_private_key() {
        let tmp_dir = tempdir().unwrap();
        let file_path = tmp_dir.path().join("test_secret.txt");

        // Ensure load attempt fails.
        let load_attempt = PrivateKey::load(&file_path);
        assert!(load_attempt.is_err());

        // Attempt to load nonexistent private key from file (creates a new one).
        let private_key = PrivateKey::load_or_create_new(&file_path).unwrap();

        // Ensure the private key was saved to file by `load_or_create_new()`.
        let load_attempt = PrivateKey::load(&file_path);
        assert!(load_attempt.is_ok());

        // Load the private key from file and ensure it matches the original.
        let retrieved_private_key = PrivateKey::load_or_create_new(&file_path).unwrap();
        assert_eq!(private_key.as_bytes(), retrieved_private_key.as_bytes());
    }
}
