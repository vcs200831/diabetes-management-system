// Simple games for kids: quiz, food sorting, matching
function qs(id){return document.getElementById(id);}
const area = document.getElementById("game_area");

const quiz_data = [
  {q:"Which is good for sugar control?", a:"Apple", choices:["Apple","Candy","Soda"]},
  {q:"What helps lower blood sugar after meal?", a:"Walk", choices:["Sit","Walk","Sleep"]},
  {q:"Which is a sugary drink?", a:"Soda", choices:["Water","Soda","Salad"]}
];

function clearArea(){ area.innerHTML=""; }

function playQuiz(){
  clearArea();
  let idx = 0; let score = 0;
  const card = document.createElement("div"); card.className="game";
  const qEl = document.createElement("div"); const choicesEl = document.createElement("div");
  const nextBtn = document.createElement("button"); nextBtn.innerText="Next";
  function render(){
    qEl.innerText = quiz_data[idx].q;
    choicesEl.innerHTML = "";
    quiz_data[idx].choices.forEach(ch=>{
      const b = document.createElement("button"); b.innerText = ch; b.style.margin="6px";
      b.onclick = ()=>{ if(ch===quiz_data[idx].a) score++; b.disabled=true; };
      choicesEl.appendChild(b);
    });
  }
  render();
  nextBtn.onclick = ()=>{
    idx++;
    if(idx>=quiz_data.length){ card.innerHTML = `<h3>Done! Score: ${score}/${quiz_data.length}</h3>`; return; }
    render();
  };
  card.appendChild(qEl); card.appendChild(choicesEl); card.appendChild(nextBtn);
  area.appendChild(card);
}

function playSort(){
  clearArea();
  const foods = [
    {name:"Apple", healthy:true},{name:"Candy", healthy:false},{name:"Milk", healthy:true},
    {name:"Soda", healthy:false},{name:"Bread", healthy:true},{name:"Chips", healthy:false}
  ];
  const card = document.createElement("div"); card.className="game";
  const items = document.createElement("div");
  const green = document.createElement("div"); green.className="basket"; green.innerText="Healthy (green)";
  const red = document.createElement("div"); red.className="basket"; red.innerText="Unhealthy (red)";
  foods.forEach(f=>{
    const d = document.createElement("div"); d.className="food-item"; d.innerText = f.name; d.draggable=true;
    d.ondragstart = (e)=> e.dataTransfer.setData("text/plain", f.name);
    items.appendChild(d);
  });
  [green, red].forEach(b=>{
    b.ondragover = (e)=> e.preventDefault();
    b.ondrop = (e)=> {
      const name = e.dataTransfer.getData("text/plain");
      const el = document.createElement("div"); el.innerText = name;
      b.appendChild(el);
    };
  });
  const check = document.createElement("button"); check.innerText="Check";
  check.onclick = ()=>{
    let score=0, total=foods.length;
    const greenNames = Array.from(green.children).map(x=>x.innerText);
    const redNames = Array.from(red.children).map(x=>x.innerText);
    foods.forEach(f=>{ if(f.healthy && greenNames.includes(f.name)) score++; if(!f.healthy && redNames.includes(f.name)) score++; });
    card.innerHTML = `<h3>Your score: ${score}/${total}</h3>`;
  };
  card.appendChild(items); card.appendChild(green); card.appendChild(red); card.appendChild(check);
  area.appendChild(card);
}

function playMatch(){
  clearArea();
  const pairs = [
    ["Insulin","Helps glucose enter cells"],
    ["Glucose","Sugar in blood"],
    ["Exercise","Helps lower glucose"]
  ];
  const flat = [];
  pairs.forEach(p=>{ flat.push({t:p[0],pair:p[0]}); flat.push({t:p[1],pair:p[0]}); });
  flat.sort(()=>Math.random()-0.5);
  const grid = document.createElement("div"); grid.className="match-grid";
  let first = null; let found=0;
  flat.forEach((f,i)=>{
    const c = document.createElement("div"); c.className="match-card"; c.innerText=f.t;
    c.onclick = ()=>{
      if(first===null){ first={el:c,pair:f.pair}; c.style.border="2px solid green"; }
      else{
        if(first.pair===f.pair && first.el!==c){ found+=1; first.el.style.visibility="hidden"; c.style.visibility="hidden"; first=null;
        } else { if(first.el) first.el.style.border="1px solid #eee"; first=null; }
      }
      if(found>=pairs.length) grid.innerHTML = "<h3>All matched! Great job!</h3>";
    };
    grid.appendChild(c);
  });
  area.appendChild(grid);
}

document.getElementById("btn_quiz").addEventListener("click", playQuiz);
document.getElementById("btn_sort").addEventListener("click", playSort);
document.getElementById("btn_match").addEventListener("click", playMatch);
