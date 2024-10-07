console.log("Hello, world!");

type RSSItem = {
    title: string;
    link: string;
    summary: string;
    content: string;
    pubDate: string;
    creator: string;
    categories: string[];
    id: string;
    isoDate: string;
}

async function fetchContents(lowerBound: number, upperBound: number): Promise<void> {
    let response: Response | null = null;
    try {
        response = await fetch(`/api/feed?lower_bound=${lowerBound}&upper_bound=${upperBound}`);
    } catch (error) {
        throw new Error(`Failed to fetch contents: ${error}`);
    }
    console.log("response", response);
    if (response?.status !== 200) {
        console.error("Failed to fetch contents");
        return;
    } else {
        console.log("Fetched contents successfully");
        const container = document.getElementById("feed");
        if (!container) {
            throw new Error("Failed to find feed container");
        }
        const content = await response.json()
        console.log("content", content);
        for (const item of content) {
            container.appendChild(createFeedItem(item));
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    try {
        fetchContents(0, 10);
    } catch (error) {
        const snackbar = document.createElement("div");
        snackbar.textContent = `${error}`;
        snackbar.classList.add("snackbar", "error");
        document.appendChild(snackbar);
    }
});


function createFeedItem(itemContent: RSSItem): HTMLElement {
    const item = document.createElement("div");
    const contentContainer = document.createElement("div");
    item.classList.add("feed-item");
    const itemLink = document.createElement("a");
    itemLink.href = itemContent.link;

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
    likeButton.textContent = "Like";
    likeButton.addEventListener("click", () => {
        console.log("Liked post", itemId);
    });

    const hideButton = document.createElement("button");
    hideButton.textContent = "Hide";
    hideButton.addEventListener("click", () => {
        console.log("Hid post", itemId);
    });

    actionsContainer.appendChild(likeButton);
    actionsContainer.appendChild(hideButton);

    return actionsContainer;
}