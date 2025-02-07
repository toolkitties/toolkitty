<script type="ts">
  let { space } = $props();
</script>

<a href={`/app/spaces/${space.id}`} class="flex border-black border space-row">
  <img
    src={space.image}
    alt=""
    class="aspect-square object-cover w-[30%] min-w-32 max-w-72 grow"
  />
  <div class="flex flex-col gap-1 p-2">
    <h3>{space.name}</h3>
    <span>{space.address}</span>
    <span>{space.description}</span>
  </div>
</a>

<style>
  .space-row:not(:last-child) {
    border-bottom: 0px;
  }
</style>
