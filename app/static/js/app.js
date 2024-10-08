"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function fetchContents(lowerBound, upperBound) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = null;
        try {
            response = yield fetch(`/api/feed?lower_bound=${lowerBound}&upper_bound=${upperBound}`);
        }
        catch (error) {
            throw new Error(`Failed to fetch contents: ${error}`);
        }
        if ((response === null || response === void 0 ? void 0 : response.status) !== 200) {
            throw new Error(`invalid response: ${response}`);
        }
        else {
            console.log("Fetched contents successfully");
            const container = document.getElementById("feed");
            if (!container) {
                throw new Error("Failed to find feed container");
            }
            const content = yield response.json();
            console.log("content", content);
            const loader = document.getElementById("loader-container");
            if (loader) {
                loader.remove();
            }
            for (const item of content) {
                container.appendChild(createFeedItem(item));
            }
        }
    });
}
function createFeedItem(itemContent) {
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
function createActions(itemId) {
    const actionsContainer = document.createElement("div");
    actionsContainer.classList.add("post-actions");
    const likeButton = document.createElement("button");
    const likeIcon = document.createElement("span");
    likeIcon.classList.add("material-symbols-outlined");
    likeIcon.textContent = "favorite";
    likeButton.appendChild(likeIcon);
    likeButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
        console.log("Liked post", itemId);
        likeButton.classList.toggle("liked");
        const response = yield fetch(`/api/like?id=${itemId}`, { method: "POST" });
        if (response.status !== 200) {
            likeButton.classList.toggle("liked");
            console.error(`Failed to like post: ${response}`);
        }
    }));
    const hideButton = document.createElement("button");
    const hideIcon = document.createElement("span");
    hideIcon.classList.add("material-symbols-outlined");
    hideIcon.textContent = "visibility_off";
    hideButton.appendChild(hideIcon);
    hideButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
        console.log("Hid post", itemId);
        const post = document.getElementById(itemId);
        if (post) {
            post.classList.add("hidden");
            const response = yield fetch(`/api/hide?id=${itemId}`, { method: "POST" });
            if (response.status !== 200) {
                post.classList.remove("hidden");
                console.error(`Failed to hide post: ${response}`);
            }
            else {
                setTimeout(() => {
                    post.remove();
                }, 750);
            }
        }
    }));
    actionsContainer.appendChild(likeButton);
    actionsContainer.appendChild(hideButton);
    return actionsContainer;
}
document.addEventListener("DOMContentLoaded", () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let startIndex = 0;
        let endIndex = 10;
        yield fetchContents(startIndex, endIndex);
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
    }
    catch (error) {
        const snackbar = document.createElement("div");
        snackbar.textContent = `${error}`;
        snackbar.classList.add("snackbar", "error");
        document.appendChild(snackbar);
    }
}));
