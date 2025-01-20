type Calendar = {
  id: string;
  owner: string;
  created_at: number;
}

type OperationMeta = {
  calendar: Calendar;
  operationId: string;
  publicKey: string;
};

type StreamMessage =
  | {
      meta: OperationMeta;
      event: "application";
      data: ApplicationMessage;
    }
  | {
      meta: OperationMeta;
      event: "error";
      data: string;
    };

type InviteCodeReadyMessage = {
  event: "invite_codes_ready";
};

type InviteCodeMessage = {
  event: "invite_codes";
  data: ResolveInviteCodeRequest | ResolveInviteCodeResponse;
};

type ChannelMessage =
  | StreamMessage
  | InviteCodeReadyMessage
  | InviteCodeMessage;

type ApplicationMessage = {
  type: "calendar_created";
  data: {
    title: string;
  };
};

type ResolveInviteCodeRequest = {
  inviteCode: string;
  timestamp: number;
  messageType: "request";
};

type ResolveInviteCodeResponse = {
  calendarId: string;
  inviteCode: string;
  timestamp: number;
  messageType: "response";
};
