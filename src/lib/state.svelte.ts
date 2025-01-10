class Calendar {
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
calendars.addCalendar(
  new Calendar(
    "5a7bc8522433759260bdcb77648890b5da10297ed477776611c3c5f83342b025"
  )
);
