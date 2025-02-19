<script lang="ts">
  import ResourceCalendar from "../../../../../components/resource-calendar.svelte";

  let spaces =  [
    {
      "id": 1,
      "name": "Main Stage",
      "type": "Physical",
      "description": "A stage, a main one",
      "address": "123 Street Street",
      "contact": "Message on Signal",
      "Capacity": 200,
      "accessibility_information": "Wheelchair access",
      "message": "",
      "links": ["www.somewebsite.com"],
      "availability": [
        {
          "date": "2025-01-06T14:40:02.536Z",
          "timeslots": ["18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00", "21:00 - 22:00", "22:00 - 23:00"]
        },
        {
          "date": "2025-01-08T14:40:02.536Z",
          "timeslots": [ "20:00 - 21:00", "22:00 - 23:00", "23:00 - 00:00", "00:00 - 01:00"]
        }
      ],
      "alwaysAvailable": false,
      "images": ["https://placecats.com/neo_banana/300/200", "https://placecats.com/neo_2/300/200"]
    },
    {
      "id": 2,
      "name": "Recording Studio",
      "type": "Physical",
      "description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis feugiat sapien odio, vitae sollicitudin neque ornare id. Cras suscipit, tellus at ornare fermentum, massa eros pretium felis, ac pharetra nisi urna in lectus.",
      "address": "34 Road Avenue",
      "contact": "Message on Signal",
      "Capacity": 20,
      "accessibility_information": "www.website.com/accessibility",
      "message": "",
      "links": ["www.website.com"],
      "availability": [
        {
          "date": "2025-01-10T14:40:02.536Z",
          "timeslots": ["10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00", "13:00 - 14:00"]
        }
      ],
      "alwaysAvailable": false,
      "images": ["https://placecats.com/neo_banana/300/200", "https://placecats.com/neo_2/300/200", "https://placecats.com/g/300/200"]
    },
    {
      "id": 3,
      "name": "The Park",
      "type": "GPS",
      "description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis feugiat sapien odio, vitae sollicitudin neque ornare id. Cras suscipit, tellus at ornare fermentum, massa eros pretium felis, ac pharetra nisi urna in lectus.",
      "address": "38.8977° N, 77.0365° W",
      "contact": "07777777777",
      "Capacity": 30,
      "accessibility_information": "some info",
      "message": "See park opening hours for availability",
      "links": [],
      "availability": [],
      "alwaysAvailable": true,
      "images": ["https://placecats.com/neo_banana/300/200"]
    },
    {
      "id": 4,
      "name": "Jitsi room",
      "type": "Virtual",
      "description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis feugiat sapien odio, vitae sollicitudin neque ornare id. Cras suscipit, tellus at ornare fermentum, massa eros pretium felis, ac pharetra nisi urna in lectus.",
      "address": "https://meet.jit.si/example",
      "contact": "n/a just go to link",
      "Capacity": 10,
      "accessibility_information": "some info",
      "message": "",
      "links": [],
      "availability": [],
      "alwaysAvailable": true,
      "images": []
    }
  ]

  let resources =  [
  {
    "id": 1,
    "title": "Projector",
    "description": "Epson CO-FH01 Full HD Projector",
    "message": "Doesn't come with HDMI",
    "availability": [
      {
        "date": "2025-01-06T14:40:02.536Z",
        "timeslots": [ "19:00 - 20:00", "20:00 - 21:00", "22:00 - 23:00"]
      }
    ],
    "quantity": 1,
    "images": ["https://placecats.com/neo_banana/300/200", "https://placecats.com/neo_2/300/200"]
  },
  {
    "id": 2,
    "title": "XLR Cables",
    "description": "as above",
    "message": "Call me to confirm pick up",
    "availability": [
      {
        "date": "2025-01-09T12:40:02.536Z",
        "timeslots": [ "19:00 - 20:00", "20:00 - 21:00", "22:00 - 23:00"]
      }
    ],
    "quantity": 10,
    "images": []
  }
]

let tags = ["tag 1", "tag 2", "tag 3"]
let tagColours = ["bg-yellow-light", "bg-fluro-green-light", "bg-red-light"];

let currentlySelectedSpaceId = $state(1);
let currentlySelectedResourceId = $state(1);
</script>


<form>
  <label for="event-name">Event Name *</label>
  <input name="event-name" type="text" required>

  <label for="event-description">Description *</label>
  <textarea name="event-description" required ></textarea>

  <p>Ticket link</p>
  <label for="ticket-link-text">Link Text</label>
  <input name="ticket-link-text" type="text">
  <label for="ticket-link-url">Url</label>
  <input name="ticket-link-url" type="text">

  <p>Other link (website, social media)</p>
  <label for="ticket-link-text">Link Text</label>
  <input name="ticket-link-text" type="text">
  <label for="ticket-link-url">Url</label>
  <input name="ticket-link-url" type="text">


  <!-- @TODO - validation to ensure space selection, resource selection, event date and time overlap -->
  <label for="select-space">Select Space</label>
  <select name="select-space" bind:value={currentlySelectedSpaceId}>
    {#each spaces as space}
      <option value={space.id} selected={space.id === currentlySelectedSpaceId}>
        {space.name}
      </option>
    {/each}
  </select>
  
  <div class="space-availability">
    <p>Select from available dates for {spaces.find(space => space.id === currentlySelectedSpaceId)?.name}</p>
    {#key currentlySelectedSpaceId}
    <ResourceCalendar
      resources={spaces}
      currentlySelectedId={currentlySelectedSpaceId}
    />
    {/key}
  </div>

  <label for="select-resource">Select Resource</label>
  <select name="select-resource" bind:value={currentlySelectedResourceId}>
    {#each resources as resource}
      <option value={resource.id} selected={resource.id === currentlySelectedResourceId}>
        {resource.title}
      </option>
    {/each}
  </select>

  <div class="resource-availability">
    <p>Select from available dates for {resources.find(resource => resource.id === currentlySelectedResourceId)?.title}</p>
    {#key currentlySelectedResourceId}
    <ResourceCalendar
      resources={resources}
      currentlySelectedId={currentlySelectedResourceId}
    />
    {/key}
  </div>

  <p>Event start</p>
  <label for="event-name">Date *</label>
  <input name="event-name" type="date" required>
  <label for="event-start-time">Time *</label>
  <input name="event-start-time" type="time" required>

  <p>Event end</p>
  <label for="event-name">Date *</label>
  <input name="event-name" type="date" required>
  <label for="event-start-time">Time *</label>
  <input name="event-start-time" type="time" required>

  <!-- image upload component here-->

  {#each tags as tag, index}
    <div class={`tag ${tagColours[index]}`}>{tag}</div>
  {/each}

  <button>Discard</button>
  <button type="submit">Publish</button>
</form>
