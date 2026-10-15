async function loadDish() {
    const viewerMessage = document.querySelector(".viewer-message");
    if (viewerMessage) {
        viewerMessage.textContent = "Loading dish...";
    }

    try {
        const isHomePage = window.location.pathname === "/";
        const slug = window.location.pathname.split("/").filter(Boolean).pop();
        const response = await fetch(
            isHomePage ? "/api/dishes" : `/api/dishes/${encodeURIComponent(slug)}`
        );

        if (!response.ok) {
            throw new Error("Dish not found");
        }

        const responseData = await response.json();
        const dish = Array.isArray(responseData) ? responseData[0] : responseData;

        if (!dish) {
            throw new Error("No dishes are currently available.");
        }

        document.querySelector(".category").textContent = dish.category;
        document.querySelector("h1").textContent = dish.name;
        document.title = `${dish.name} | Restaurant`;
        document.querySelector(".description").textContent =
            dish.description;
        document.querySelector(".price").textContent = `Rs. ${dish.price}`;

        const modelViewer = document.querySelector("model-viewer");
        modelViewer.src = dish.modelUrl;
        modelViewer.alt = `3D model of ${dish.name}`;
        modelViewer.setAttribute("ios-src", dish.usdzUrl);
        if (viewerMessage) {
            viewerMessage.textContent = "";
        }
    } catch (error) {
        console.error(error);

        if (viewerMessage) {
            viewerMessage.textContent = error.message || "Unable to load this dish.";
        }
    }
}

loadDish();
