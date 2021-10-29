const inputs = document.querySelectorAll("input, select, textarea")

inputs.forEach((input) => {
  input.addEventListener("change", async (event) => {
    const { target: { name, value } } = event
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: (name, value) => {
        console.log(`save: { ${name}: ${value} }`);
        chrome.storage.local.set({ [name]: value });
      },
      args: [name, value],
    })
  })
})
