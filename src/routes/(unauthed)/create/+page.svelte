<script>
  import Calendar from '../../../components/calendar.svelte';
</script>

<h1>Welcome to ToolKitties! Start here to organise your own programme.</h1>

<form>
  <input id="name" name="name" type="text" placeholder="Programme name" />
  <input id="username" name="username" type="text" placeholder="Your name" />
  <Calendar 
    use={"festival creation"}
    canSelectMultiple={true} 
    hasTimePicker={false} 
/>
  <button class="border border-black rounded p-4" type="submit">Create</button>
</form>
