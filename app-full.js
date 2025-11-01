/* ================= Firebase Init ================= */
const firebaseConfig = {
  apiKey: "AIzaSyCswU-LrTo6nOe_JkmepizOHwWyZxbteCc",
  authDomain: "famfresh-ea11f.firebaseapp.com",
  projectId: "famfresh-ea11f",
  storageBucket: "famfresh-ea11f.appspot.com",
  messagingSenderId: "713550151605",
  appId: "1:713550151605:web:48641c0ed46771542223fc",
  measurementId: "G-TW5GD58FYC"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const storage = firebase.storage();

/* ================= Demo Data ================= */
const demoOwner = 'demo@famfresh.com';

const appData = {
  async addProduct({ name, price, unit, category, description, imageDataUrl, ownerEmail }) {
    await db.collection('products').add({
      name, price, unit, category, description,
      image: imageDataUrl || '',
      owner: ownerEmail,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },
  async getProducts() {
    const snap = await db.collection('products').orderBy('createdAt','desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async removeProduct(id) {
    await db.collection('products').doc(id).delete();
  },
  async seedIfEmpty() {
    const products = await this.getProducts();
    if(products.length>0) return;
    const demo = [
      { name:'Tomatoes', price:50, unit:'kg', category:'Vegetables', description:'Fresh red tomatoes', owner:demoOwner },
      { name:'Mangoes', price:120, unit:'kg', category:'Fruits', description:'Sweet mangoes', owner:demoOwner },
      { name:'Carrots', price:60, unit:'kg', category:'Vegetables', description:'Orange carrots', owner:demoOwner },
      { name:'Bananas', price:40, unit:'kg', category:'Fruits', description:'Ripe bananas', owner:demoOwner }
    ];
    for(const p of demo) await this.addProduct({...p, imageDataUrl:''});
  }
};

/* ================= Cart API ================= */
const cartAPI = {
  getCart() { return JSON.parse(localStorage.getItem('cart')||'[]'); },
  addItem(item) {
    const arr = this.getCart();
    const idx = arr.findIndex(i=>i.id===item.id);
    if(idx>-1) arr[idx].quantity += item.quantity || 1;
    else arr.push({...item, quantity:item.quantity||1});
    localStorage.setItem('cart', JSON.stringify(arr));
  },
  removeItem(idx){
    const arr=this.getCart(); arr.splice(idx,1);
    localStorage.setItem('cart', JSON.stringify(arr));
  },
  clearCart(){ localStorage.removeItem('cart'); },
  getTotal(){ return this.getCart().reduce((sum,i)=>sum+i.price*i.quantity,0); }
};

/* ================= Weather Helper ================= */
const OPENWEATHER_API_KEY = "OPENWEATHER_API_KEY"; // Replace with your key
async function getLocalWeatherText(){
  try{
    if(!navigator.geolocation) return 'Geolocation not supported.';
    const pos = await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:10000}));
    const lat=pos.coords.latitude, lon=pos.coords.longitude;
    if(!OPENWEATHER_API_KEY||OPENWEATHER_API_KEY==='OPENWEATHER_API_KEY') return 'OpenWeather key not configured.';
    const resp = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`);
    if(!resp.ok) return 'Weather fetch failed.';
    const data = await resp.json();
    let advice='';
    if(data.main.temp>30) advice+='Hot — protect seedlings. ';
    if((data.weather[0].main||'').toLowerCase().includes('rain')) advice+='Rain expected — protect harvest. ';
    if(data.wind && data.wind.speed>8) advice+='Windy — stake crops. ';
    if(!advice) advice='No immediate weather actions needed.';
    return `Weather: ${data.name} — ${data.weather[0].description}, ${data.main.temp}°C. Advice: ${advice}`;
  } catch(e){ console.error(e); return 'Unable to get weather.'; }
}

/* ================= Chatbot ================= */
const OPENAI_CHAT_ENDPOINT="OPENAI_CHAT_ENDPOINT"; // replace with your endpoint
function createChatUI(rootId='chatbot-root'){
  let root=document.getElementById(rootId);
  if(!root) root=document.body.appendChild(document.createElement('div'));
  root.innerHTML=`
    <div class="chat-bubble fixed right-5 bottom-5 z-50">
      <div id="chatHeader" class="bg-gradient-to-br from-green-700 to-yellow-500 text-white p-3 rounded-t-xl shadow cursor-pointer">FamFresh Helper</div>
      <div class="chat-window hidden bg-white rounded-b-xl shadow p-3 w-80 max-w-xs">
        <div id="chatMessages" class="h-56 overflow-auto text-sm space-y-2"></div>
        <div class="mt-3 flex gap-2">
          <input id="chatInput" placeholder="Ask about weather, pests, storage..." class="flex-1 border rounded px-3 py-2"/>
          <button id="sendBtn" class="bg-green-700 text-white px-3 py-2 rounded">Ask</button>
        </div>
        <div class="mt-2 text-xs text-gray-500">Tip: ask "weather" for local tips.</div>
      </div>
    </div>`;
  const header=root.querySelector('#chatHeader');
  const windowEl=root.querySelector('.chat-window');
  const sendBtn=root.querySelector('#sendBtn');
  const chatInput=root.querySelector('#chatInput');
  const messagesEl=root.querySelector('#chatMessages');

  header.addEventListener('click', ()=> windowEl.classList.toggle('hidden'));
  function addMessage(role,text){ messagesEl.innerHTML+=`<div class="${role==='bot'?'text-gray-800':'text-green-700'}"><strong>${role==='bot'?'FamFresh':'You'}:</strong> ${text}</div>`; messagesEl.scrollTop=messagesEl.scrollHeight; }
  async function getAIReply(prompt){
    if(prompt.toLowerCase().includes('weather')) return await getLocalWeatherText();
    return 'AI response placeholder — integrate OpenAI endpoint.';
  }
  sendBtn.addEventListener('click', async ()=>{
    const prompt=chatInput.value.trim(); if(!prompt) return;
    addMessage('user',prompt); chatInput.value='';
    addMessage('bot','Thinking...');
    const reply=await getAIReply(prompt);
    messagesEl.removeChild(messagesEl.lastElementChild);
    addMessage('bot',reply);
  });
}

/* ================= Init on all pages ================= */
document.addEventListener('DOMContentLoaded', async ()=>{
  await appData.seedIfEmpty();
  createChatUI('chatbot-root');
});
