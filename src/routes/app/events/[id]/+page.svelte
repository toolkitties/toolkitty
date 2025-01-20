<script lang="ts">

    interface Image {
        url: string;
        altText: string | " "; // should we allow users to not set this? Image could be decorative only, but also could enable skipping of alt text out of laziness.
    }

    interface Link {
        url: string;
        text: string;
    }

    let eventTitle: string = "Placeholder title";
    let mainEventImage: Image = {
        url: "https://placecats.com/neo_banana/300/200",
        altText: "A very cute cat"
    }
    let eventDate: string = "2025-01-06T14:40:02.536Z";
    let eventStartTime: string = "19:30";
    let eventEndTime: string = "23:00";
    let spacePageId: string = "1";
    let space = "Main Stage";
    let description = "The colours of the construction paper constitute a symbolic alphabet  which allows an ephemeral materialisation of the spirit of epistemological and mystical anarchism. My paper collages are dwelling  beyond the art market and other capitalist systems. Creation is a  magical practice, the action is meaningful here and now. The paper will  wither someday and new people will speak new languages and will create  new senses. So let’s talk about what is important for us today, discover the eternal freedom and light up our own senses."
    let links: Link[] = [
        {
            url: "www.example.com",
            text: "Organiser website"
        }
    ];
    let secondaryImages: Image[] = [
        {
            url: "https://placecats.com/bella/300/200",
            altText: "A very cute cat"
        },
        {
            url: "https://placecats.com/g/300/200",
            altText: "Another cute cat"
        },
    ]
    let tags = ["tag 1", "tag 2", "tag 3"]
    let tagColours = ["bg-yellow-light", "bg-fluro-green-light", "bg-red-light"];
    
</script>

<h1>{eventTitle}</h1>
<img src="{mainEventImage.url}" alt="{mainEventImage.altText}">
<p>{eventDate}</p>
<p>{eventStartTime} - {eventEndTime}</p>
<p><a href="app/spaces/{spacePageId}">{space}</a></p>
<p>{description}</p>
{#if links}
    <h2>Useful Links:</h2>
    {#each links as link}
        <a href="{link.url}">{link.text}</a>
    {/each}
{/if}
<!-- @TODO - decide how we are handling map embeds -->
{#each secondaryImages as image}
    <img src="{image.url}" alt="{image.altText}" />
{/each}
{#each tags as tag, index}
    <div class={`tag ${tagColours[index]}`}>{tag}</div>
{/each}


