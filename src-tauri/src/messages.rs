use serde::ser::SerializeStruct;
use serde::Serialize;

use crate::node::operation::CalendarId;
use crate::node::StreamEvent;

#[derive(Clone, Debug)]
pub enum ChannelEvent {
    Stream(StreamEvent),
    InviteCodesReady,
    InviteCodes(serde_json::Value),
    CalendarSelected(CalendarId),
    SubscribedToCalendar(CalendarId),
    CalendarGossipJoined(CalendarId),
}

impl Serialize for ChannelEvent {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match self {
            ChannelEvent::Stream(stream_event) => stream_event.serialize(serializer),
            ChannelEvent::InviteCodesReady => {
                let mut state = serializer.serialize_struct("StreamEvent", 1)?;
                state.serialize_field("event", "invite_codes_ready")?;
                state.end()
            }
            ChannelEvent::InviteCodes(payload) => {
                let mut state = serializer.serialize_struct("StreamEvent", 2)?;
                state.serialize_field("event", "invite_codes")?;
                state.serialize_field("data", &payload)?;
                state.end()
            }
            ChannelEvent::CalendarSelected(calendar_id) => {
                let mut state = serializer.serialize_struct("StreamEvent", 2)?;
                state.serialize_field("event", "calendar_selected")?;
                state.serialize_field("calendarId", &calendar_id)?;
                state.end()
            }
            ChannelEvent::SubscribedToCalendar(calendar_id) => {
                let mut state = serializer.serialize_struct("StreamEvent", 2)?;
                state.serialize_field("event", "subscribed_to_calendar")?;
                state.serialize_field("calendarId", &calendar_id)?;
                state.end()
            }
            ChannelEvent::CalendarGossipJoined(calendar_id) => {
                let mut state = serializer.serialize_struct("StreamEvent", 2)?;
                state.serialize_field("event", "calendar_gossip_joined")?;
                state.serialize_field("calendarId", &calendar_id)?;
                state.end()
            }
        }
    }
}
