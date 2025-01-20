export class Calendar {
  constructor(id: string, owner: string, created_at: number) {
    this.id = id;
    this.owner = owner;
    this.created_at = created_at;
  }

  inviteCode() {
    return this.id.slice(0, 4);
  }

  public id: string = "";
  public owner: string = "";
  public created_at: number = 0;
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
