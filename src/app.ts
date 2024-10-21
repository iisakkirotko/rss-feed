type RSSItem = {
    title: string;
    link: string;
    summary: string;
    media?: string;
    published: string;
    categories: string[];
    id: string;
    liked: boolean;
    hidden: boolean;
}

async function fetchContents(lowerBound: number, upperBound: number): Promise<void> {
    let response: Response | null = null;
    try {
        response = await fetch(`/api/feed?lower_bound=${lowerBound}&upper_bound=${upperBound}`);
        if (response?.status !== 200) {
            throw new Error(`invalid response: ${response}`);
        }
        console.log("Fetched contents successfully");
        const container = document.getElementById("feed");
        if (!container) {
            throw new Error("Failed to find feed container");
        }
        const content = await response.json()
        for (const item of content) {
            container.appendChild(createFeedItem(item));
        }
    } catch (error) {
        throw new Error(`Failed to fetch contents: ${error}`);
    } finally {
        const loader = document.getElementById("loader-container");
        if (loader) {
            loader.remove();
        }
    }
}

function createFeedItem(itemContent: RSSItem): HTMLElement {
    const item = document.createElement("div");
    item.id = itemContent.id;
    const contentContainer = document.createElement("div");
    item.classList.add("feed-item");
    const itemLink = document.createElement("a");
    itemLink.href = itemContent.link;
    itemLink.target = "_blank";

    if (itemContent.media) {
        const media = document.createElement("img");
        media.src = itemContent.media;
        media.classList.add("feed-item-media");
        item.appendChild(media);
    }

    const itemTitle = document.createElement("h3");
    itemTitle.textContent = itemContent.title;
    const summary = document.createElement("p");
    summary.textContent = itemContent.summary;
    
    itemLink.appendChild(itemTitle);
    itemLink.appendChild(summary);
    contentContainer.appendChild(itemLink);

    item.appendChild(contentContainer);
    item.appendChild(createActions(itemContent.id));

    return item;
}

function createActions(itemId: string): HTMLDivElement {
    const actionsContainer = document.createElement("div");
    actionsContainer.classList.add("post-actions");

    const likeButton = document.createElement("button");
    const likeIcon = document.createElement("span");
    likeIcon.classList.add("material-symbols-outlined");
    likeIcon.textContent = "favorite";
    likeButton.appendChild(likeIcon);

    likeButton.addEventListener("click", async () => {
        console.log("Liked post", itemId);
        likeButton.classList.toggle("liked");
        const response = await fetch(`/api/like?id=${itemId}`, {method: "POST"});
        if (response.status !== 200) {
            likeButton.classList.toggle("liked");
            console.error(`Failed to like post: ${response}`);
        }
    });

    const hideButton = document.createElement("button");
    const hideIcon = document.createElement("span");
    hideIcon.classList.add("material-symbols-outlined");
    hideIcon.textContent = "visibility_off";
    hideButton.appendChild(hideIcon);

    hideButton.addEventListener("click", async () => {
        console.log("Hid post", itemId);
        const post = document.getElementById(itemId);
        if (post) {
            post.classList.add("hidden");
            const response = await fetch(`/api/hide?id=${itemId}`, {method: "POST"});
            if (response.status !== 200) {
                post.classList.remove("hidden");
                console.error(`Failed to hide post: ${response}`);
            } else {
                setTimeout(() => {
                    post.remove();
                }, 750);
            }
        }
    });

    actionsContainer.appendChild(likeButton);
    actionsContainer.appendChild(hideButton);

    return actionsContainer;
}


document.addEventListener("DOMContentLoaded", async () => {
    try {
        let startIndex = 0;
        let endIndex = 10;
        await fetchContents(startIndex, endIndex);
        const feedEnd = document.querySelector('#bottom-of-feed');

        // Observe the bottom of the feed container coming into view to trigger loading more content
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.intersectionRatio > 0) {
                    const loaderContainer = document.createElement("div");
                    loaderContainer.id = "loader-container";
                    const loader = document.createElement("div");
                    loader.id = "loader";
                    loaderContainer.appendChild(loader);

                    const feedContainer = document.getElementById("feed");
                    if (feedContainer) {
                        feedContainer.appendChild(loaderContainer);
                    }

                    startIndex = endIndex;
                    endIndex += 10;
                    fetchContents(startIndex, endIndex);
                }
            });
        }, {
            root: null, // use the viewport as the root
            threshold: 0.1
        });

        if (!feedEnd) {
            throw new Error("Failed to find feed container");
        }
        observer.observe(feedEnd);
    } catch (error) {
        const snackbar = document.createElement("div");
        snackbar.textContent = `${error}`;
        snackbar.classList.add("snackbar", "error");
        document.appendChild(snackbar);
    }
});
