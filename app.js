
"use strict";

const WORKOUTS = [
  {
    title:"DAY 1 — FULL BODY STRENGTH", icon:"🟢",
    goal:"Build muscle + increase calorie burn",
    focus:"Keep controlled form and complete each set before moving on.",
    rest:60,
    exercises:[
      ["Bodyweight Squats","4 × 15"],
      ["Push-Ups","4 × 10–15"],
      ["Reverse Lunges","3 × 12/leg"],
      ["Glute Bridges","3 × 15"],
      ["Mountain Climbers","3 × 30 sec"]
    ]
  },
  {
    title:"DAY 2 — FAT-BURNING CARDIO", icon:"🔵",
    goal:"Increase calorie expenditure + improve cardiovascular fitness",
    focus:"Keep moving and maintain a sustainable pace.",
    rest:30,
    exercises:[
      ["High Knees","4 × 30 sec"],
      ["Jumping Jacks","4 × 45 sec"],
      ["Fast Bodyweight Squats","3 × 30 sec"],
      ["Mountain Climbers","4 × 30 sec"],
      ["Brisk Walk","1 × 20–30 min"]
    ]
  },
  {
    title:"DAY 3 — CORE & LOWER ABS", icon:"🟠",
    goal:"Strengthen your core + improve abdominal control",
    focus:"Slow down the reps. Focus on controlling your core rather than rushing.",
    rest:45,
    exercises:[
      ["Reverse Crunches","4 × 12–15"],
      ["Dead Bugs","3 × 10/side"],
      ["Leg Raises","3 × 10–15"],
      ["Plank","3 × 30–60 sec"],
      ["Bicycle Crunches","3 × 15/side"]
    ]
  },
  {
    title:"DAY 4 — LOW-IMPACT CARDIO", icon:"🟣",
    goal:"Burn calories while improving endurance",
    focus:"Stay active without completely exhausting yourself.",
    rest:45,
    exercises:[
      ["March in Place","1 × 5 min"],
      ["Step-Ups","4 × 12/leg"],
      ["Alternating Reverse Lunges","3 × 12/leg"],
      ["Shadow Boxing","4 × 1 min"],
      ["Outdoor Brisk Walk","1 × 30–45 min"]
    ]
  },
  {
    title:"DAY 5 — LOWER BODY + CORE", icon:"🔴",
    goal:"Build your legs/glutes + strengthen your midsection",
    focus:"Use controlled reps and focus on your legs, glutes and midsection.",
    rest:45,
    exercises:[
      ["Bulgarian Split Squats","3 × 10/leg"],
      ["Sumo Squats","4 × 15"],
      ["Single-Leg Glute Bridges","3 × 12/leg"],
      ["Reverse Crunches","3 × 15"],
      ["Plank Knee-to-Elbow","3 × 10/side"]
    ]
  }
];

const STORAGE = "workout-companion-v9";
let state = loadState();
let activeTimer = null;
let timerInterval = null;

const tabs = document.getElementById("tabs");
const content = document.getElementById("content");

function blankState(){
  return {selectedDay:0, completed:{}, elapsed:{}, previousTotals:{}};
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE);
    if(!raw) return blankState();
    const parsed = JSON.parse(raw);
    return {
      selectedDay:Number.isInteger(parsed.selectedDay) ? parsed.selectedDay : 0,
      completed:parsed.completed || {},
      elapsed:parsed.elapsed || {},
      previousTotals:parsed.previousTotals || {}
    };
  }catch(e){
    return blankState();
  }
}

function saveState(){
  localStorage.setItem(STORAGE,JSON.stringify(state));
}

function setKey(day,exercise,set){
  return `${day}-${exercise}-${set}`;
}

function totalKey(day,exercise){
  return `${day}-${exercise}`;
}

function setCount(exerciseIndex){
  const prescription = WORKOUTS[state.selectedDay].exercises[exerciseIndex][1];
  const match = prescription.match(/^(\d+)\s*[×x]/);
  return match ? Number(match[1]) : 1;
}

function isCompleted(exercise,set){
  return state.completed[setKey(state.selectedDay,exercise,set)] === true;
}

function getElapsed(exercise,set){
  return Number(state.elapsed[setKey(state.selectedDay,exercise,set)] || 0);
}

function getCurrentExerciseTotal(exercise){
  let total = 0;
  for(let s=1;s<=setCount(exercise);s++) total += getElapsed(exercise,s);
  return total;
}

function allSetsComplete(exercise){
  for(let s=1;s<=setCount(exercise);s++){
    if(!isCompleted(exercise,s)) return false;
  }
  return true;
}

function formatTime(seconds){
  const value = Math.max(0,Math.floor(Number(seconds)||0));
  const minutes = Math.floor(value/60);
  const secs = value % 60;
  if(minutes === 0) return `${secs}s`;
  return `${minutes}m ${String(secs).padStart(2,"0")}s`;
}

function formatClock(seconds){
  const value = Math.max(0,Math.floor(Number(seconds)||0));
  return `${String(Math.floor(value/60)).padStart(2,"0")}:${String(value%60).padStart(2,"0")}`;
}

function doseText(prescription){
  return prescription.replace(/^\d+\s*[×x]\s*/,"");
}

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,function(ch){
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch];
  });
}

function renderTabs(){
  tabs.innerHTML = WORKOUTS.map(function(w,i){
    return `<button class="tab ${i===state.selectedDay?"active":""}" onclick="selectDay(${i})">Day ${i+1}</button>`;
  }).join("");
}

function selectDay(day){
  stopTimer(false);
  state.selectedDay = day;
  saveState();
  render();
  window.scrollTo({top:0,behavior:"smooth"});
}

function getNextSet(){
  const workout = WORKOUTS[state.selectedDay];
  for(let exercise=0; exercise<workout.exercises.length; exercise++){
    const count=setCount(exercise);
    for(let set=1; set<=count; set++){
      if(!isCompleted(exercise,set)) return {exercise,set};
    }
  }
  return null;
}

function canStartSet(exercise,set){
  const next=getNextSet();
  if(!next) return false;
  return next.exercise===exercise && next.set===set && !activeTimer;
}

function startSet(exercise,set){
  if(isCompleted(exercise,set)) return;
  if(activeTimer) return;
  if(!canStartSet(exercise,set)) return;

  activeTimer = {
    exercise:exercise,
    set:set,
    startedAt:Date.now(),
    base:getElapsed(exercise,set)
  };
  timerInterval = setInterval(updateRunningTimer,250);
  updateRunningTimer();
  render();
}

function updateRunningTimer(){
  if(!activeTimer) return;
  const button = document.querySelector(`[data-timer="${activeTimer.exercise}-${activeTimer.set}"]`);
  const row = document.querySelector(`[data-row="${activeTimer.exercise}-${activeTimer.set}"]`);
  const elapsed = activeTimer.base + Math.floor((Date.now()-activeTimer.startedAt)/1000);
  if(button) {
    button.textContent = formatClock(elapsed);
    button.className = "timer-button running";
  }
  if(row) row.classList.add("active");
}

function stopTimer(saveCurrent){
  if(!activeTimer){
    clearInterval(timerInterval);
    timerInterval = null;
    return;
  }
  const elapsed = activeTimer.base + Math.floor((Date.now()-activeTimer.startedAt)/1000);
  if(saveCurrent !== false){
    state.elapsed[setKey(state.selectedDay,activeTimer.exercise,activeTimer.set)] = elapsed;
    saveState();
  }
  clearInterval(timerInterval);
  timerInterval = null;
  activeTimer = null;
}

function finishSet(exercise,set){
  if(activeTimer && activeTimer.exercise===exercise && activeTimer.set===set){
    const elapsed = activeTimer.base + Math.floor((Date.now()-activeTimer.startedAt)/1000);
    state.elapsed[setKey(state.selectedDay,exercise,set)] = elapsed;
    stopTimer(false);
  }
  state.completed[setKey(state.selectedDay,exercise,set)] = true;

  if(allSetsComplete(exercise)){
    const total = getCurrentExerciseTotal(exercise);
    state.previousTotals[totalKey(state.selectedDay,exercise)] = total;
  }
  saveState();
  render();
}

function timerClicked(exercise,set){
  if(isCompleted(exercise,set)) return;

  if(activeTimer && activeTimer.exercise===exercise && activeTimer.set===set){
    finishSet(exercise,set);
    return;
  }

  if(activeTimer) return;
  startSet(exercise,set);
}

function checkClicked(exercise,set,checked){
  const next=getNextSet();

  if(!checked){
    state.completed[setKey(state.selectedDay,exercise,set)] = false;
    saveState();
    render();
    return;
  }

  // A set can only be completed through the active/current set.
  if(activeTimer && activeTimer.exercise===exercise && activeTimer.set===set){
    finishSet(exercise,set);
    return;
  }

  // Do not allow users to skip ahead by checking a future set.
  if(next && next.exercise===exercise && next.set===set){
    startSet(exercise,set);
  } else {
    render();
  }
}

function resetDay(){
  stopTimer(false);
  const day = state.selectedDay;
  WORKOUTS[day].exercises.forEach(function(_,exercise){
    for(let set=1;set<=setCount(exercise);set++){
      delete state.completed[setKey(day,exercise,set)];
      delete state.elapsed[setKey(day,exercise,set)];
    }
  });
  saveState();
  render();
}

function render(){
  renderTabs();

  const workout = WORKOUTS[state.selectedDay];
  let totalSets = 0;
  let completedSets = 0;

  workout.exercises.forEach(function(_,exercise){
    const count = setCount(exercise);
    totalSets += count;
    for(let set=1;set<=count;set++){
      if(isCompleted(exercise,set)) completedSets++;
    }
  });

  const percent = totalSets ? (completedSets/totalSets)*100 : 0;

  let exercisesHtml = "";

  workout.exercises.forEach(function(exerciseData,exercise){
    const name = exerciseData[0];
    const prescription = exerciseData[1];
    const count = setCount(exercise);
    const currentTotal = getCurrentExerciseTotal(exercise);
    const previous = Number(state.previousTotals[totalKey(state.selectedDay,exercise)] || 0);
    const completeCount = Array.from({length:count},(_,i)=>isCompleted(exercise,i+1)).filter(Boolean).length;

    const totalBadge = currentTotal > 0
      ? `<span class="total-badge has-time">${formatTime(currentTotal)}</span>`
      : `<span class="total-badge">Total —</span>`;

    const previousText = previous > 0
      ? `Previous total: <strong>${formatTime(previous)}</strong>`
      : `No previous time yet`;

    let setsHtml = "";
    const next=getNextSet();

    for(let set=1;set<=count;set++){
      const done = isCompleted(exercise,set);
      const elapsed = getElapsed(exercise,set);
      const running = activeTimer && activeTimer.exercise===exercise && activeTimer.set===set;
      const isNext = next && next.exercise===exercise && next.set===set;
      const locked = !done && !running && !isNext;

      let buttonLabel = "START";
      let buttonClass = "timer-button";

      if(running){
        buttonLabel = formatClock(activeTimer.base + Math.floor((Date.now()-activeTimer.startedAt)/1000));
        buttonClass += " running";
      }else if(done){
        buttonLabel = formatTime(elapsed);
        buttonClass += " finished";
      }else if(elapsed > 0){
        buttonLabel = formatTime(elapsed);
      }

      const disabled = locked ? "disabled" : "";

      setsHtml += `
        <div class="set-row ${running?"current ":""}${done?"finished ":""}${locked?"locked":""}" data-row="${exercise}-${set}">
          <input class="check" type="checkbox" ${done?"checked":""} ${locked?"disabled":""}
            onchange="checkClicked(${exercise},${set},this.checked)" aria-label="Complete set ${set}">
          <div>
            <div class="set-title">Set ${set}</div>
            <div class="set-dose">${escapeHtml(doseText(prescription))}</div>
          </div>
          <button class="${buttonClass}" data-timer="${exercise}-${set}" ${disabled} onclick="timerClicked(${exercise},${set})">${buttonLabel}</button>
        </div>`;
    }

    const exerciseLocked = next && exercise > next.exercise;
    exercisesHtml += `
      <section class="exercise ${exerciseLocked?"locked":""}">
        <div class="exercise-head">
          <div>
            <div class="exercise-name">${exercise+1}. ${escapeHtml(name)}</div>
            <div class="exercise-dose">${escapeHtml(prescription)}</div>
            <div class="exercise-reference">${previousText}</div>
          </div>
          <div>
            ${totalBadge}
          </div>
        </div>
        <div class="set-list">${setsHtml}</div>
      </section>`;
  });

  content.innerHTML = `
    <section class="card">
      <div class="day-head">
        <div>
          <div class="day-title">${workout.icon} ${workout.title}</div>
          <div class="goal"><strong>Training Goal:</strong> ${workout.goal}</div>
        </div>
        <span class="badge">${completedSets}/${totalSets}</span>
      </div>

      <div class="progress"><div style="width:${percent}%"></div></div>
      <div class="focus"><strong>Focus:</strong> ${workout.focus}<br><strong>Flow:</strong> Finish the active set before the next set or exercise unlocks.</div>

      ${exercisesHtml}

      <button class="reset" onclick="resetDay()">Reset today's workout</button>
    </section>

    <section class="card">
      <div class="info">
        <strong>How to use the timer</strong><br>
        Work strictly in order. Only the <strong>current set</strong> can be started. The next set and later exercises stay locked until the current set is finished.
        Tap the timer again when you finish. The exact set time is saved and the set is checked automatically.
        The exercise header keeps the <strong>total time for all sets</strong>, while the previous total is kept as your reference for the next workout.
      </div>
    </section>`;
}

render();
