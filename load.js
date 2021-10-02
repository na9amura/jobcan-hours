window.onload = async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: loadConfig,
  }, () => {
    chrome.storage.sync.get(null, ({ projects, tasks }) => {
      const select = document.querySelector("select#projectId")
      projects.forEach(([value, name]) => {
        const option = document.createElement('option')
        option.value = value
        option.text = name
        select.appendChild(option)
      })

      const dl = document.createElement('dl')
      dl.innerText = 'You can use these task id'
      tasks.forEach(([value, name]) => {
        const text = `ID: ${value} (${name})`
        const dd = document.createElement('dd')
        dd.innerText = text
        dl.appendChild(dd)
      })
      const tasksDesc = document.querySelector("#task-description")
      tasksDesc.classList.remove('hidden')
      tasksDesc.appendChild(dl)
    })
  })
}

/**
 * Fetch form token and store it.
 *
 * Extract token by requesting post form.
 * TODO: Also get project ids and task ids
 */
const loadConfig = async () => {
  const _getModal = async () => {
    try {
      const time = new Date().getTime()
      const response = await fetch(`https://ssl.jobcan.jp/employee/man-hour-manage/get-man-hour-data-for-edit/unix_time/${time}`)
      const { html } = await response.json()
      const node = document.createElement('div')
      node.innerHTML = html
      return [undefined, node]
    } catch (e) {
      console.error(e)
      return [e]
    }
  }

  const _getOptions = (name) => {
    const options = modal?.querySelectorAll(`select[name="${name}[]"] > option`)
    return Array.from(options)
      .map((option) => [Number.parseInt(option.value), option.text])
      .filter(([value]) => !Number.isNaN(value) && value > 0)
      .filter(([, name]) => name !== "(未選択)")
  }

  const [_, modal] = await _getModal()
  // console.log(modal);

  const tokenInput = modal?.querySelector('input[name="token"]')
  const token = tokenInput?.value || ""
  const tasks = _getOptions("tasks")
  const projects = _getOptions("projects")


  console.log({ token, tasks, projects });
  return { token, tasks, projects }
}
