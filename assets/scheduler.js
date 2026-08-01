(function () {
  var CALENDLY_URL = "https://calendly.com/launchops-automation/30min";

  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var viewYear = today.getFullYear();
  var viewMonth = today.getMonth();
  var selectedDate = null;
  var selectedSlot = null;

  var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  var grid = document.getElementById("calendar-grid");
  var monthLabel = document.getElementById("month-label");
  var prevBtn = document.getElementById("prev-month");
  var nextBtn = document.getElementById("next-month");
  var dateLabel = document.getElementById("selected-date");
  var slotList = document.getElementById("slot-list");
  var slotDateLabel = document.getElementById("slot-date-label");
  var confirmWrap = document.getElementById("confirm-wrap");
  var tzSelect = document.getElementById("tz-select");
  var tzLabel = document.getElementById("tz-label");

  function renderMonth() {
    var firstDay = new Date(viewYear, viewMonth, 1);
    var startOffset = (firstDay.getDay() + 6) % 7;
    var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    monthLabel.textContent = monthNames[viewMonth] + " " + viewYear;

    var canPrev = !(viewYear === today.getFullYear() && viewMonth === today.getMonth());
    prevBtn.disabled = !canPrev;

    var html = "";
    for (var i = 0; i < startOffset; i++) {
      html += '<div class="cal-cell empty"></div>';
    }
    for (var d = 1; d <= daysInMonth; d++) {
      var date = new Date(viewYear, viewMonth, d);
      var isWeekend = date.getDay() === 0 || date.getDay() === 6;
      var isPast = date.getTime() < today.getTime();
      var disabled = isWeekend || isPast;
      var isSelected = selectedDate && selectedDate.getTime() === date.getTime();

      var cls = "cal-cell";
      if (disabled) cls += " disabled";
      else cls += " available";
      if (isSelected) cls += " selected";

      html += '<div class="' + cls + '" data-y="' + date.getFullYear() + '" data-m="' + date.getMonth() + '" data-d="' + d + '">' + d + "</div>";
    }
    grid.innerHTML = html;

    var cells = grid.querySelectorAll(".cal-cell.available");
    for (var c = 0; c < cells.length; c++) {
      cells[c].addEventListener("click", function () {
        selectDate(new Date(parseInt(this.dataset.y, 10), parseInt(this.dataset.m, 10), parseInt(this.dataset.d, 10)));
      });
    }
  }

  function selectDate(date) {
    selectedDate = date;
    selectedSlot = null;

    var label = dayNames[date.getDay()] + ", " + monthsShort[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
    dateLabel.textContent = label;
    slotDateLabel.textContent = "Available times for " + label;
    slotDateLabel.style.display = "";
    confirmWrap.style.display = "none";

    renderMonth();
    renderSlots();
  }

  function generateSlots() {
    var slots = [];
    var minutes = 9 * 60;
    var end = 17 * 60;
    while (minutes + 45 <= end) {
      slots.push(minutes);
      minutes += 45;
    }
    return slots;
  }

  function formatTime(minutes) {
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    var ampm = h >= 12 ? "PM" : "AM";
    var h12 = h % 12 === 0 ? 12 : h % 12;
    var mm = m === 0 ? "00" : String(m);
    return h12 + ":" + mm + " " + ampm;
  }

  function renderSlots() {
    if (!selectedDate) {
      slotList.innerHTML = '<div class="slot-empty">Select a date to see available times.</div>';
      return;
    }
    var slots = generateSlots();
    if (!slots.length) {
      slotList.innerHTML = '<div class="slot-empty">No available times on this date.</div>';
      return;
    }
    var html = "";
    for (var i = 0; i < slots.length; i++) {
      var t = slots[i];
      var sel = selectedSlot === t;
      html += '<button type="button" class="slot-btn' + (sel ? " selected" : "") + '" data-time="' + t + '">' + formatTime(t) + "</button>";
    }
    slotList.innerHTML = html;

    var btns = slotList.querySelectorAll(".slot-btn");
    for (var b = 0; b < btns.length; b++) {
      btns[b].addEventListener("click", function () {
        selectedSlot = parseInt(this.dataset.time, 10);
        renderSlots();
        confirmWrap.style.display = "";
      });
    }
  }

  function getZoneOffset(zone, date) {
    try {
      var dtf = new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      var map = {};
      dtf.formatToParts(date).forEach(function (p) {
        map[p.type] = parseInt(p.value, 10);
      });
      var asUTC = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
      return Math.round((asUTC - date.getTime()) / 60000);
    } catch (e) {
      return -date.getTimezoneOffset();
    }
  }

  function tzText(zone) {
    if (zone === "UTC") {
      return "GMT+00:00 UTC";
    }
    var offset = getZoneOffset(zone, new Date());
    var sign = offset >= 0 ? "+" : "-";
    var ah = Math.floor(Math.abs(offset) / 60);
    var am = Math.abs(offset) % 60;
    var gmt = "GMT" + sign + String(ah).padStart(2, "0") + ":" + String(am).padStart(2, "0");
    return gmt + " " + zone;
  }

  function initTimezones() {
    var detected = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    var zones = [detected, "Africa/Lagos", "Europe/London", "America/New_York", "America/Chicago", "America/Los_Angeles", "Asia/Dubai", "Asia/Kolkata", "Australia/Sydney", "UTC"];
    var seen = {};
    var html = "";
    zones.forEach(function (z) {
      if (seen[z]) return;
      seen[z] = true;
      html += '<option value="' + z + '">' + z + "</option>";
    });
    tzSelect.innerHTML = html;
    tzSelect.value = detected;
    tzLabel.textContent = tzText(detected);
    tzSelect.addEventListener("change", function () {
      tzLabel.textContent = tzText(tzSelect.value);
    });
  }

  prevBtn.addEventListener("click", function () {
    viewMonth--;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear--;
    }
    renderMonth();
  });

  nextBtn.addEventListener("click", function () {
    viewMonth++;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear++;
    }
    renderMonth();
  });

  slotDateLabel.style.display = "none";
  confirmWrap.style.display = "none";
  renderSlots();
  initTimezones();
  renderMonth();
})();
