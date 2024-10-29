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
            if (response.status !== 200) {
                const responseText = yield response.text();
                throw new Error(`invalid response: ${responseText}`);
            }
            console.log("Fetched contents successfully");
            const container = document.getElementById("feed");
            if (!container) {
                throw new Error("Failed to find feed container");
            }
            const content = yield response.json();
            for (const item of content) {
                container.appendChild(createFeedItem(item));
            }
        }
        catch (error) {
            throw new Error(`Failed to fetch contents: ${error}`);
        }
        finally {
            const loader = document.getElementById("loader-container");
            if (loader) {
                loader.remove();
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
    item.appendChild(createActions(itemContent));
    return item;
}
function createActions(item) {
    const actionsContainer = document.createElement("div");
    actionsContainer.classList.add("post-actions");
    const likeButton = document.createElement("button");
    const likeIcon = document.createElement("span");
    likeIcon.classList.add("material-symbols-outlined");
    if (item.liked) {
        likeButton.classList.add("liked");
    }
    likeIcon.textContent = "favorite";
    likeButton.appendChild(likeIcon);
    likeButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
        console.log("Liked post", item.id);
        likeButton.classList.toggle("liked");
        try {
            const response = yield fetch(`/api/like?id=${item.id}`, { method: "POST" });
            if (response.status !== 200) {
                const responseText = yield response.text();
                throw new Error(`Invalid response: ${responseText}`);
            }
        }
        catch (error) {
            likeButton.classList.toggle("liked");
            console.error(`Failed to like post: ${error}`);
            createSnackbar(`Failed to like post: ${error}`, true, 6000);
        }
    }));
    const hideButton = document.createElement("button");
    const hideIcon = document.createElement("span");
    hideIcon.classList.add("material-symbols-outlined");
    hideIcon.textContent = "visibility_off";
    hideButton.appendChild(hideIcon);
    hideButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
        console.log("Hid post", item.id);
        const post = document.getElementById(item.id);
        if (post) {
            post.classList.add("hidden");
            const response = yield fetch(`/api/hide?id=${item.id}`, { method: "POST" });
            if (response.status !== 200) {
                post.classList.remove("hidden");
                const responseText = yield response.text();
                console.error(`Failed to hide post: ${responseText}`);
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
function createSnackbar(message, error, timeout) {
    const snackbar = document.createElement("div");
    snackbar.textContent = `${message}`;
    snackbar.classList.add("snackbar");
    if (error) {
        snackbar.classList.add("error");
    }
    // Create a close button
    const closeButton = document.createElement("button");
    // Add the close icon to the button
    const closeIcon = document.createElement("span");
    closeIcon.classList.add("material-symbols-outlined");
    closeIcon.textContent = "close";
    closeButton.appendChild(closeIcon);
    closeButton.classList.add("close");
    closeButton.addEventListener("click", () => {
        snackbar.remove();
    });
    snackbar.appendChild(closeButton);
    document.getElementsByTagName("body")[0].appendChild(snackbar);
    if (timeout) {
        setTimeout(() => {
            snackbar.remove();
        }, timeout);
    }
}
function createBackdrop(callback) {
    const backdrop = document.createElement("div");
    backdrop.id = "backdrop";
    document.getElementsByTagName("body")[0].appendChild(backdrop);
    backdrop.addEventListener("click", () => {
        backdrop.remove();
        if (callback) {
            callback();
        }
    });
}
document.addEventListener("DOMContentLoaded", () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let startIndex = 0;
        let endIndex = 10;
        yield fetchContents(startIndex, endIndex);
        const feedEnd = document.querySelector('#bottom-of-feed');
        const addFeedButton = document.getElementById("add-feed");
        const addFeedForm = document.getElementById("add-feed-form");
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
                    try {
                        fetchContents(startIndex, endIndex);
                    }
                    catch (error) {
                        console.error(`Failed to load contents: ${error}`);
                        createSnackbar(`Failed to load contents: ${error}`, true, 6000);
                    }
                }
            });
        }, {
            root: null, // use the viewport as the root
            threshold: 0.1
        });
        if (!feedEnd) {
            throw new Error("Failed to find feed container");
        }
        if (!addFeedButton) {
            throw new Error("Failed to find add feed button");
        }
        if (!addFeedForm) {
            throw new Error("Failed to find add feed form");
        }
        observer.observe(feedEnd);
        addFeedButton.addEventListener("click", () => {
            const addForm = document.getElementById("add-feed-form");
            if (addForm) {
                addForm.classList.toggle("active");
                createBackdrop(() => {
                    addForm.classList.remove("active");
                });
            }
        });
        addFeedForm.addEventListener("submit", (event) => __awaiter(void 0, void 0, void 0, function* () {
            event.preventDefault();
            const feedUrl = document.getElementById("feed-url");
            if (!feedUrl) {
                throw new Error("Failed to find feed url input");
            }
            try {
                const response = yield fetch(`/api/add_feed?url=${feedUrl.value}`, { method: "POST" });
                if (response.status !== 200) {
                    const responseText = yield response.text();
                    throw new Error(`Invalid response: ${responseText}`);
                }
                createSnackbar("Feed added successfully", false, 6000);
                feedUrl.value = "";
            }
            catch (error) {
                console.error(`Failed to add feed: ${error}`);
                createSnackbar(`Failed to add feed: ${error}`, true, 6000);
            }
        }));
    }
    catch (error) {
        console.error(`Failed to load contents: ${error}`);
        createSnackbar(`Failed to load contents: ${error}`, true, 6000);
    }
}));
