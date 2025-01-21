export class Calendar {
  constructor(id: string) {
    this.id = id;
  }

  inviteCode() {
    return this.id.slice(0, 4);
  }

  public id: string = "";
}

class Calendars {
  private calendars: Calendar[] = [];

  addCalendar(calendar: Calendar) {
    this.calendars.push(calendar);
  }

  findCalendarByInviteCode(inviteCode: string): undefined | Calendar {
    return this.calendars.find((calendar) => {
      return calendar.inviteCode() === inviteCode;
    });
  }
}

export const calendars = new Calendars();
