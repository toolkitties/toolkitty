<script lang="ts">
  import { db } from "$lib/db";

  function deleteDB() {
    // delete database and recreate it whenever the db instance is accessed again:
    db.delete({ disableAutoOpen: false });
  }
</script>

<button onclick={deleteDB}>clear db</button>
