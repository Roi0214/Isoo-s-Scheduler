/**
 * 로컬 시뮬레이션 스크립트
 * node test-scheduler.mjs 로 실행
 */

// ── 스케줄러 코드 인라인 (api/schedule-homework.js에서 복사) ──

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function minutesToTime(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}
function getWeekDates(weekStart) {
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + i)
    dates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
  }
  return dates
}
function getDayOfWeek(dateStr) { return new Date(dateStr + 'T00:00:00').getDay() }
function isWeekend(dateStr) { const d = getDayOfWeek(dateStr); return d===0||d===6 }
function prevDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate()-1)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function getSchedulesForDate(schedules, dateStr) {
  const dow = getDayOfWeek(dateStr)
  return schedules.filter(s => {
    if (!s.days.includes(dow)) return false
    if (s.exceptions && s.exceptions.includes(dateStr)) return false
    if (s.effectiveFrom && dateStr < s.effectiveFrom) return false
    if (s.effectiveTo   && dateStr > s.effectiveTo)   return false
    return true
  })
}
const HARD_DEADLINE = 22*60+30
function calcAvailableSlots(schedules, googleEvents, dateStr) {
  const weekend  = isWeekend(dateStr)
  const dayStart = weekend ? 9*60 : 16*60
  const fixedBlocks = getSchedulesForDate(schedules, dateStr)
    .filter(s => s.category !== 'mission')
    .map(s => ({ start: timeToMinutes(s.startTime), end: timeToMinutes(s.endTime) }))
  const gcBlocks = (googleEvents||[])
    .filter(e => e.date===dateStr && !e.allDay && e.startTime && e.endTime)
    .map(e => ({ start: timeToMinutes(e.startTime), end: timeToMinutes(e.endTime) }))
  const mealBlocks = weekend
    ? [{start:12*60,end:13*60},{start:18*60,end:19*60}]
    : [{start:18*60,end:19*60}]
  const allBlocks = [...fixedBlocks,...gcBlocks,...mealBlocks]
    .filter(b => b.end>dayStart && b.start<HARD_DEADLINE)
    .map(b => ({start:Math.max(b.start,dayStart),end:Math.min(b.end,HARD_DEADLINE)}))
    .sort((a,b) => a.start-b.start)
  const slots=[]; let cursor=dayStart
  for (const block of allBlocks) {
    if (block.start>cursor) slots.push({start:cursor,end:block.start})
    cursor=Math.max(cursor,block.end)
  }
  if (cursor<HARD_DEADLINE) slots.push({start:cursor,end:HARD_DEADLINE})
  return slots.filter(s => s.end-s.start>=10)
}
function buildLinkedEventMap(schedules, weekDates) {
  const map={}
  for (const dateStr of weekDates)
    for (const s of getSchedulesForDate(schedules,dateStr)) {
      if (!map[s.title]) map[s.title]=[]
      if (!map[s.title].includes(dateStr)) map[s.title].push(dateStr)
    }
  return map
}
function getLinkedDates(linkedEvent, linkedEventMap) {
  if (!linkedEvent) return []
  if (linkedEventMap[linkedEvent]) return linkedEventMap[linkedEvent]
  const dates=new Set()
  for (const [title,dateList] of Object.entries(linkedEventMap))
    if (title.startsWith(linkedEvent)) dateList.forEach(d=>dates.add(d))
  return [...dates].sort()
}

function runScheduler(homeworks, schedules, googleEvents, weekDates) {
  const blocks=[], unscheduled=[]
  const hwMap=Object.fromEntries(homeworks.map(h=>[h.id,h]))
  const linkedEventMap=buildLinkedEventMap(schedules,weekDates)
  const dayUsed={}
  weekDates.forEach(d=>{dayUsed[d]=[]})

  function subtractUsed(slots,used) {
    let result=[...slots]
    for (const u of used)
      result=result.flatMap(s=>{
        if(u.end<=s.start||u.start>=s.end) return [s]
        const parts=[]
        if(u.start>s.start) parts.push({start:s.start,end:u.start})
        if(u.end<s.end)     parts.push({start:u.end,end:s.end})
        return parts
      }).filter(s=>s.end-s.start>=10)
    return result
  }
  function getRemaining(dateStr) {
    return subtractUsed(calcAvailableSlots(schedules,googleEvents,dateStr),dayUsed[dateStr]||[])
  }
  function totalRemainingMins(dateStr) {
    return getRemaining(dateStr).reduce((sum,s)=>sum+s.end-s.start,0)
  }
  function markUsed(dateStr,start,end) {
    dayUsed[dateStr].push({start,end})
    dayUsed[dateStr].sort((a,b)=>a.start-b.start)
  }
  function countHighMedOnDate(dateStr) {
    return blocks.filter(b=>{
      if(b.date!==dateStr) return false
      const hw=hwMap[b.homework_id]
      return hw?.priority==='high'||hw?.priority==='medium'
    }).length
  }
  function preferredRange(difficulty,dateStr) {
    if(difficulty!=='상') return null
    return isWeekend(dateStr)?{start:9*60,end:14*60}:{start:19*60,end:21*60}
  }
  function findSlot(dateStr,duration,pref) {
    const slots=getRemaining(dateStr)
    if(pref) {
      for(const s of slots){
        const rs=Math.max(s.start,pref.start),re=Math.min(s.end,pref.end)
        if(re-rs>=duration) return {start:rs,end:rs+duration}
      }
    }
    for(const s of slots) if(s.end-s.start>=duration) return {start:s.start,end:s.start+duration}
    return null
  }
  function addBlock(hw,dateStr,start,end,unitsToday) {
    blocks.push({homework_id:hw.id,homework_title:hw.title,subject:hw.subject,
      date:dateStr,start_time:minutesToTime(start),end_time:minutesToTime(end),units_today:unitsToday??null})
    markUsed(dateStr,start,end)
  }
  function getCandidateDates(hw,targetDate) {
    if(targetDate) return weekDates.includes(targetDate)?[targetDate]:[]
    const classDates=new Set(getLinkedDates(hw.linked_event,linkedEventMap))
    const weekendDays=weekDates.filter(d=>isWeekend(d)&&!classDates.has(d))
    // 주말 우선: 차주 마감 OR 금요일 수업 연동(수업 후 주말 처리)
    const lastWeekDate=weekDates[weekDates.length-1]
    const fridayClassDate=[...classDates].filter(d=>getDayOfWeek(d)===5).sort().pop()
    const isNextWeekDue=hw.dueDate&&hw.dueDate>lastWeekDate
    const weekendFirst=isNextWeekDue||(!!fridayClassDate&&(!hw.dueDate||hw.dueDate>=fridayClassDate))
    if(hw.fixed_d1&&classDates.size>0)
      return [...classDates].map(prevDay).filter(d=>weekDates.includes(d)).sort()
    if(hw.fixed_d1&&hw.dueDate) return weekDates.filter(d=>d===hw.dueDate)
    if(classDates.size>0){
      let wkd=weekDates.filter(d=>!classDates.has(d)&&!isWeekend(d)&&(!hw.dueDate||d<=hw.dueDate))
      if(wkd.length===0) wkd=weekDates.filter(d=>!classDates.has(d)&&!isWeekend(d))
      if(!hw.is_divisible)
        return weekendFirst
          ?[...weekendDays,...[...wkd].sort((a,b)=>b.localeCompare(a))]
          :[...[...wkd].sort((a,b)=>b.localeCompare(a)),...weekendDays]
      return weekendFirst?[...weekendDays,...wkd]:[...wkd,...weekendDays]
    }
    const wkd=weekDates.filter(d=>!isWeekend(d)&&(!hw.dueDate||d<=hw.dueDate))
    return weekendFirst?[...weekendDays,...wkd]:[...wkd,...weekendDays]
  }
  function scheduleOne(hw,targetDate) {
    const candidates=getCandidateDates(hw,targetDate)
    if(candidates.length===0){
      unscheduled.push({homework_id:hw.id,homework_title:hw.title,reason:'배치 가능한 날짜 없음'})
      return false
    }
    const pref=d=>preferredRange(hw.difficulty,d)
    if(!hw.is_divisible){
      for(const d of candidates){
        const slot=findSlot(d,hw.estimated_minutes,pref(d))
        if(slot){addBlock(hw,d,slot.start,slot.end,null);return true}
      }
      unscheduled.push({homework_id:hw.id,homework_title:hw.title,reason:'슬롯 부족'})
      return false
    }
    const unit=hw.unit||hw.estimated_minutes
    let remaining=hw.estimated_minutes
    let prevRemaining
    do {
      prevRemaining=remaining
      for(const d of candidates){
        if(remaining<=0) break
        const chunk=Math.min(remaining,unit)
        const slot=findSlot(d,chunk,pref(d))
        if(slot){addBlock(hw,d,slot.start,slot.end,chunk);remaining-=chunk}
      }
    } while(remaining>0&&remaining!==prevRemaining)
    if(remaining>0){
      const placed=hw.estimated_minutes-remaining
      unscheduled.push({homework_id:hw.id,homework_title:hw.title,
        reason:placed>0?`부분배치(${placed}/${hw.estimated_minutes}분)`:'슬롯 부족'})
      return false
    }
    return true
  }

  const PRIORITY_ORDER={high:0,medium:1,low:2}
  const fixed_d1Hws=homeworks.filter(hw=>hw.fixed_d1&&!hw.repeat)
  fixed_d1Hws.sort((a,b)=>(a.dueDate||'').localeCompare(b.dueDate||''))
  for(const hw of fixed_d1Hws) scheduleOne(hw,null)

  const repeatEntries=[]
  for(const hw of homeworks.filter(h=>h.repeat))
    for(const d of weekDates){
      if(hw.dueDate&&d>hw.dueDate) continue
      repeatEntries.push({hw,targetDate:d})
    }
  repeatEntries.sort((a,b)=>{
    const pd=(PRIORITY_ORDER[a.hw.priority]??1)-(PRIORITY_ORDER[b.hw.priority]??1)
    return pd!==0?pd:a.targetDate.localeCompare(b.targetDate)
  })
  for(const {hw,targetDate} of repeatEntries){
    if(hw.subject==='mission'&&isWeekend(targetDate)) continue
    if(hw.priority==='low'&&(totalRemainingMins(targetDate)<60||countHighMedOnDate(targetDate)>=2)) continue
    scheduleOne(hw,targetDate)
  }

  const highMedHws=homeworks.filter(hw=>!hw.fixed_d1&&!hw.repeat&&hw.priority!=='low')
  highMedHws.sort((a,b)=>{
    const pd=(PRIORITY_ORDER[a.priority]??1)-(PRIORITY_ORDER[b.priority]??1)
    return pd!==0?pd:(a.dueDate||'').localeCompare(b.dueDate||'')
  })
  for(const hw of highMedHws) scheduleOne(hw,null)

  const lowHws=homeworks.filter(hw=>!hw.fixed_d1&&!hw.repeat&&hw.priority==='low')
  lowHws.sort((a,b)=>(a.dueDate||'').localeCompare(b.dueDate||''))
  for(const hw of lowHws){
    const candidates=getCandidateDates(hw,null)
    const hasFreeSlot=candidates.some(d=>totalRemainingMins(d)>=hw.estimated_minutes)
    if(!hasFreeSlot){
      unscheduled.push({homework_id:hw.id,homework_title:hw.title,reason:'우선순위낮음-슬롯없음'})
      continue
    }
    scheduleOne(hw,null)
  }
  return {blocks,unscheduled}
}

// ── 실제 데이터 ──────────────────────────────────────────────
// 이번주 날짜 계산
const today = new Date('2026-04-28T00:00:00')  // 화요일
const dow = today.getDay()  // 2=화
const mondayOffset = dow === 0 ? -6 : 1 - dow
const monday = new Date(today)
monday.setDate(today.getDate() + mondayOffset)
const WEEK_START = `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`

function thisWeekDay(dayOfWeek) {
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const d = new Date(monday)
  d.setDate(monday.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function nextWeekDay(dayOfWeek) {
  const offset = (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + 7
  const d = new Date(monday)
  d.setDate(monday.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const HOMEWORKS = [
  { id:'hw-twinkle-voca-1st',   subject:'english', title:'트윈클 보카 1차(픽션+논픽션20개)', dueDate:thisWeekDay(4), priority:'high',   repeat:false, status:'backlog', difficulty:'상', estimated_minutes:200, is_divisible:true,  unit:40,   total_units:200, linked_event:'트윈클' },
  { id:'hw-twinkle-voca-2nd',   subject:'english', title:'트윈클 보카복습 2차(D-1전날고정)',   dueDate:thisWeekDay(4), priority:'high',   repeat:false, status:'backlog', difficulty:'상', estimated_minutes:60,  is_divisible:false, unit:null, total_units:null, linked_event:'트윈클', fixed_d1:false },
  { id:'hw-twinkle-writing-f',  subject:'english', title:'트윈클 픽션 라이팅',              dueDate:thisWeekDay(4), priority:'high',   repeat:false, status:'backlog', difficulty:'중', estimated_minutes:60,  is_divisible:false, unit:null, total_units:null, linked_event:'트윈클' },
  { id:'hw-twinkle-writing-nf', subject:'english', title:'트윈클 논픽션 라이팅',            dueDate:thisWeekDay(4), priority:'high',   repeat:false, status:'backlog', difficulty:'중', estimated_minutes:60,  is_divisible:false, unit:null, total_units:null, linked_event:'트윈클' },
  { id:'hw-math-tutor-review',  subject:'math',    title:'수학과외 복습',                   dueDate:thisWeekDay(5), priority:'high',   repeat:false, status:'backlog', difficulty:'중', estimated_minutes:120, is_divisible:true,  unit:60,   total_units:120, linked_event:'수학과외' },
  { id:'hw-english-reading',    subject:'english', title:'영어리딩 픽션(3~5챕터)',          dueDate:thisWeekDay(0), priority:'medium', repeat:false, status:'backlog', difficulty:'하', estimated_minutes:120, is_divisible:true,  unit:40,   total_units:120, linked_event:null },
  { id:'hw-calc-mon',  subject:'math', title:'연산1장(월)', dueDate:thisWeekDay(1), priority:'low', repeat:false, status:'backlog', difficulty:'하', estimated_minutes:15, is_divisible:false, linked_event:'하윤네 수학' },
  { id:'hw-calc-tue',  subject:'math', title:'연산1장(화)', dueDate:thisWeekDay(2), priority:'low', repeat:false, status:'backlog', difficulty:'하', estimated_minutes:15, is_divisible:false, linked_event:'하윤네 수학' },
  { id:'hw-calc-wed',  subject:'math', title:'연산1장(수)', dueDate:thisWeekDay(3), priority:'low', repeat:false, status:'backlog', difficulty:'하', estimated_minutes:15, is_divisible:false, linked_event:'하윤네 수학' },
  { id:'hw-calc-thu',  subject:'math', title:'연산1장(목)', dueDate:thisWeekDay(4), priority:'low', repeat:false, status:'backlog', difficulty:'하', estimated_minutes:15, is_divisible:false, linked_event:'하윤네 수학' },
  { id:'hw-calc-fri',  subject:'math', title:'연산1장(금)', dueDate:thisWeekDay(5), priority:'low', repeat:false, status:'backlog', difficulty:'하', estimated_minutes:15, is_divisible:false, linked_event:'하윤네 수학' },
  { id:'hw-chapter-mon', subject:'math', title:'단원평가1챕터(월)', dueDate:thisWeekDay(1), priority:'low', repeat:false, status:'backlog', difficulty:'하', estimated_minutes:15, is_divisible:false, linked_event:'하윤네 수학' },
  { id:'hw-chapter-tue', subject:'math', title:'단원평가1챕터(화)', dueDate:thisWeekDay(2), priority:'low', repeat:false, status:'backlog', difficulty:'하', estimated_minutes:15, is_divisible:false, linked_event:'하윤네 수학' },
  { id:'hw-chapter-wed', subject:'math', title:'단원평가1챕터(수)', dueDate:thisWeekDay(3), priority:'low', repeat:false, status:'backlog', difficulty:'하', estimated_minutes:15, is_divisible:false, linked_event:'하윤네 수학' },
  { id:'hw-chapter-thu', subject:'math', title:'단원평가1챕터(목)', dueDate:thisWeekDay(4), priority:'low', repeat:false, status:'backlog', difficulty:'하', estimated_minutes:15, is_divisible:false, linked_event:'하윤네 수학' },
  { id:'hw-chapter-fri', subject:'math', title:'단원평가1챕터(금)', dueDate:thisWeekDay(5), priority:'low', repeat:false, status:'backlog', difficulty:'하', estimated_minutes:15, is_divisible:false, linked_event:'하윤네 수학' },
  { id:'hw-gummon-daily',      subject:'mission', title:'구몬(등교전)', dueDate:null, priority:'high', repeat:true, status:'backlog', difficulty:'하', estimated_minutes:15, is_divisible:false },
  { id:'hw-nonfiction-reading', subject:'reading', title:'비문학 책읽기', dueDate:thisWeekDay(0), priority:'low', repeat:false, status:'backlog', difficulty:'하', estimated_minutes:120, is_divisible:false },
  // ── 주말 우선 배치 테스트 ──────────────────────────────────
  // 차주 라이팅 (dueDate=차주 목요일): 이번 주 토/일에 미리 배치 기대
  { id:'hw-writing-next-week',  subject:'english', title:'[차주] 트윈클 논픽션 라이팅', dueDate:nextWeekDay(4), priority:'high', repeat:false, status:'backlog', difficulty:'중', estimated_minutes:60, is_divisible:false, linked_event:'트윈클' },
  // 금요일 수학과외 숙제 (dueDate=금요일): 토/일 우선 기대
  { id:'hw-math-tutor-fri',     subject:'math',    title:'[금요] 수학과외 숙제', dueDate:thisWeekDay(5), priority:'high', repeat:false, status:'backlog', difficulty:'중', estimated_minutes:60, is_divisible:false, linked_event:'수학과외' },
]

const SCHEDULES = [
  { id:'school-mtf',   title:'학교', startTime:'09:00', endTime:'13:40', days:[1,2,3,5], category:'school', exceptions:[] },
  { id:'school-thu',   title:'학교', startTime:'09:00', endTime:'14:30', days:[4],       category:'school', exceptions:[] },
  { id:'piano-mon',    title:'피아노',     startTime:'14:00', endTime:'14:40', days:[1], category:'arts',    exceptions:[] },
  { id:'hayoon-mon',   title:'하윤네 수학', startTime:'14:40', endTime:'15:40', days:[1], category:'math',    exceptions:[] },
  { id:'mathtutor-mon',title:'수학과외',   startTime:'16:00', endTime:'17:30', days:[1], category:'math',    exceptions:[] },
  { id:'twinkle-nf',   title:'트윈클 논픽션', startTime:'14:40', endTime:'17:40', days:[2], category:'english', exceptions:[] },
  { id:'wiseman-tue',  title:'와이즈만',   startTime:'19:00', endTime:'21:00', days:[2], category:'science', exceptions:[] },
  { id:'cna-wed',      title:'CNA',        startTime:'14:30', endTime:'16:30', days:[3], category:'english', exceptions:[] },
  { id:'hayoon-wed',   title:'하윤네 수학', startTime:'16:30', endTime:'17:30', days:[3], category:'math',    exceptions:[] },
  { id:'twinkle-f',    title:'트윈클 픽션', startTime:'14:40', endTime:'17:40', days:[4], category:'english', exceptions:[] },
  { id:'jumprope-fri', title:'줄넘기',     startTime:'14:00', endTime:'15:00', days:[5], category:'arts',    exceptions:[] },
  { id:'mathtutor-fri',title:'수학과외',   startTime:'15:30', endTime:'17:00', days:[5], category:'math',    exceptions:[] },
  { id:'hayoon-fri',   title:'하윤네 수학', startTime:'17:00', endTime:'18:00', days:[5], category:'math',    exceptions:[] },
  { id:'mission-gummon',title:'등교전구몬', startTime:'07:20', endTime:'07:50', days:[1,2,3,4,5], category:'mission', exceptions:[] },
]

// ── 시뮬레이션 실행 ──────────────────────────────────────────
const weekDates = getWeekDates(WEEK_START)
const backlog   = HOMEWORKS.filter(hw => hw.status !== 'completed')

console.log('='.repeat(60))
console.log(`주간: ${WEEK_START} ~ ${weekDates[6]}`)
console.log(`배분 대상: ${backlog.length}개`)
console.log('='.repeat(60))

// 날짜별 기본 가용 슬롯 출력
const DAYS_KR = ['일','월','화','수','목','금','토']
console.log('\n[날짜별 기본 가용 슬롯]')
for (const d of weekDates) {
  const slots = calcAvailableSlots(SCHEDULES, [], d)
  const total = slots.reduce((s,x)=>s+x.end-x.start,0)
  const slotStr = slots.map(s=>`${minutesToTime(s.start)}~${minutesToTime(s.end)}(${s.end-s.start}분)`).join(', ')
  console.log(`  ${d}(${DAYS_KR[getDayOfWeek(d)]}) 가용 ${total}분: ${slotStr}`)
}

// linked_event 맵 출력
const lem = buildLinkedEventMap(SCHEDULES, weekDates)
console.log('\n[학원 일정 맵]')
for (const [k,v] of Object.entries(lem)) {
  console.log(`  "${k}" → ${v.join(', ')}`)
}

// 스케줄러 실행
const {blocks, unscheduled} = runScheduler(backlog, SCHEDULES, [], weekDates)

// 날짜별로 정렬하여 출력
console.log('\n[배분 결과 - 날짜별]')
const byDate = {}
for (const d of weekDates) byDate[d] = []
for (const b of blocks) if (byDate[b.date]) byDate[b.date].push(b)

for (const d of weekDates) {
  const dayBlocks = byDate[d].sort((a,b)=>a.start_time.localeCompare(b.start_time))
  if (dayBlocks.length === 0) continue
  console.log(`\n  ${d}(${DAYS_KR[getDayOfWeek(d)]})`)
  for (const b of dayBlocks) {
    const hw = backlog.find(h=>h.id===b.homework_id)
    const pri = hw?.priority ?? '?'
    const marker = pri==='high'?'🔴':pri==='medium'?'🟡':'🔵'
    console.log(`    ${marker}[${pri}] ${b.start_time}~${b.end_time} ${b.homework_title}${b.units_today?` (${b.units_today}분)`:''}`)
  }
}

// unscheduled
console.log('\n[미배치]')
if (unscheduled.length === 0) {
  console.log('  없음 ✅')
} else {
  for (const u of unscheduled) {
    console.log(`  ❌ ${u.homework_title}: ${u.reason}`)
  }
}
console.log('\n' + '='.repeat(60))
