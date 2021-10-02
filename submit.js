const submitButton = document.querySelector("#submit")
submitButton.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: post,
  })
})

/**
 * Post task hours to jobcan.
 *
 * 1. Build form and encode them into uri component.
 * 2. Submit them sequentially.
 */
const post = async () => {
  /**
   *
   * @param {number} raw
   * @returns string
   */
  const _toMinutes = (raw) => {
    const hours = Math.floor(raw)
    const min = Math.floor(60 * (raw - hours))
    return `${hours}:${min}`
  }

  /**
   * Build form data
   *
   * @param {string} token
   * @param {number} projectId
   * @param {number} year
   * @param {number} month
   * @param {Array<{ date: number, task: number, hours: number }>} taskHours
   * @returns {[date: number, encodedForm: string]}
   */
  const _createPayload = (token, projectId, year, month, taskHours) => {
    return taskHours
      .map(({ date, ...props }) => ({ ...props, date: new Date(year, month - 1, date) }))
      .filter(({ date }) => date.getDay() !== 0 && date.getDay() !== 6)
      .map(({ date, task, hours }) => (
        [
          date,
          [
            ['token', token],
            ['index[]', 1],
            ['projects[]', projectId],
            ['tasks[]', task],
            ['minutes[]', _toMinutes(hours)],
            ['hiddenMinutes[]', hours * 60],
            ['time', date.getTime() / 1000],
            ['template_name', null],
            ['template_id', null],
          ]
        ]
      ))
      .map(([date, formEntries]) => [date, formEntries.map(([key, val])=>key+"="+encodeURIComponent(val)).join("&")])
  }

  /**
   *
   * @param {number} date
   * @param {string} form
   * @returns {Promise<Response>}
   */
  const _post = (date, form) => {
    console.log(`Submit ${date} data.`);
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'credentials': 'include',
    }
    return fetch(
      'https://ssl.jobcan.jp/employee/man-hour-manage/save',
      {
        method: 'POST',
        headers,
        body: form,
      }
    )
  }

  chrome.storage.local.get(null, ({ token, tasks, yearMonth, projectId, dateTaskHours}) => {
    console.log({ token, yearMonth, projectId, dateTaskHours });
    if (!token, !yearMonth, !projectId, !dateTaskHours) {
      throw new Error("Fill all values!")
    }

    const [year, month] = yearMonth.split("-")
    const _dateTaskHours = dateTaskHours
      .split("\n")
      .filter(Boolean)
      .map((row) => {
        const items = row.split(",")
        if (items.length !== 3) throw new Error("Invalid Date, TaskID, Hours format", items)

        const [date, task, hours] = items
                .map((item) => item.trim())
                .map((item) => {
                  const _item = Number.parseFloat(item, 10)
                  if (Number.isNaN(_item)) throw new Error("Any of Date, TaskID or Hours value were not a number", items)
                  return _item
                })
        if (!tasks.map([value]).includes(task)) {
          throw new Error("Found invalid TaskID", task)
        }
        return { date, task, hours }
      })

    console.log("post these contents", { token, projectId, year, month, _dateTaskHours })
    const dateFormTuples = _createPayload(token, projectId, year, month, _dateTaskHours)
    dateFormTuples
      .reduce(
        (acc, [date, form]) => acc.then(() => _post(date, form)),
        Promise.resolve()
      )
      .then(() => console.log("Sumbitted all data."))
      .catch(console.error)
  });

}
