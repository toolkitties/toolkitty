<form>
  <fieldset>
    <label for="physical">Physical Location</label>
    <input type="radio" name="space-type" value="physical" />
    <label for="gps">GPS coordinates</label>
    <input type="radio" name="space-type" value="gps" />
    <label for="virtual">Virtual Space</label>
    <input type="radio" name="space-type" value="virtual" />
  </fieldset>
  <label for="address">Address*</label>
  <input type="text" name="address" />
  <label for="capacity">Capacity*</label>
  <input type="text" name="capacity" />
  <label for="accessibility-details">Accessibility Details*</label>
  <textarea name="accessibility-details"></textarea>
  <label for="space-description">Space Description*</label>
  <textarea name="space-description"></textarea>
  <label for="contact-details">Contact Details*</label>
  <input type="text" name="contact-details" />
  <p>🔗 Useful link (website, social media)</p>
  <div class="flex flex-row">
    <div>
      <label for="space-link-text">Link Title</label>
      <input type="text" name="space-link-text" />
    </div>
    <div>
      <label for="space-link-url">URL</label>
      <input type="url" name="space-link-url" />
    </div>
  </div>
  <label for="space-message">Your message to anyone booking this space</label>
  <input
    type="text"
    name="space-message"
    placeholder="Please let me know in advance if..."
  />
</form>
