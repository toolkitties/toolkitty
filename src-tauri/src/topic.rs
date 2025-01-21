use std::collections::HashMap;
use std::hash::Hash as StdHash;
use std::sync::Arc;

use async_trait::async_trait;
use p2panda_core::{Hash, PublicKey};
use p2panda_net::TopicId;
use p2panda_sync::log_sync::TopicLogMap;
use p2panda_sync::TopicQuery;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use crate::node::operation::{CalendarId, LogId};

#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct Calendar {
    pub id: Hash,
    pub owner: PublicKey,
    pub created_at: u64,
}

#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
#[serde(tag = "t", content = "c", rename_all = "snake_case")]
pub enum NetworkTopic {
    InviteCodes,
    Calendar { calendar_id: CalendarId },
}

impl TopicQuery for NetworkTopic {}

impl TopicId for NetworkTopic {
    fn id(&self) -> [u8; 32] {
        match self {
            NetworkTopic::InviteCodes => Hash::new(b"invite-codes").into(),
            NetworkTopic::Calendar { calendar_id } => {
                Hash::new(format!("data-{calendar_id}").as_bytes()).into()
            }
        }
    }
}

#[derive(Clone, Debug)]
pub struct TopicMap {
    inner: Arc<RwLock<InnerTopicMap>>,
}

#[derive(Clone, Debug)]
struct InnerTopicMap {
    authors: HashMap<CalendarId, Vec<PublicKey>>,
}

impl TopicMap {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(RwLock::new(InnerTopicMap {
                authors: HashMap::new(),
            })),
        }
    }

    pub async fn add_author(&self, public_key: PublicKey, calendar_id: CalendarId) {
        let mut lock = self.inner.write().await;
        lock.authors
            .entry(calendar_id)
            .and_modify(|public_keys| public_keys.push(public_key))
            .or_insert(vec![public_key]);
    }
}

#[async_trait]
impl TopicLogMap<NetworkTopic, LogId> for TopicMap {
    async fn get(&self, topic: &NetworkTopic) -> Option<HashMap<PublicKey, Vec<LogId>>> {
        match topic {
            // We don't want to sync over invite codes.
            NetworkTopic::InviteCodes => None,
            NetworkTopic::Calendar { calendar_id } => {
                let inner = self.inner.read().await;
                let calendar_id = *calendar_id;
                inner.authors.get(&calendar_id.into()).map(|public_keys| {
                    let mut result = HashMap::with_capacity(public_keys.len());
                    for public_key in public_keys {
                        result.insert(
                            public_key.to_owned(),
                            // @NOTE(adz): Currently we store everything in one log per calendar,
                            // later we want to list all possible "log types" here, for example for
                            // all events, resources, messages etc.
                            vec![calendar_id.into()],
                        );
                    }
                    result
                })
            }
        }
    }
}
