const $ = id => document.getElementById(id);
const API_URL = window.MEDZYRA_API_URL || localStorage.getItem("medzyra_api_url") ||
  (window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api"
    : "https://medzyra-backend.onrender.com/api");
const AUTH_ENDPOINTS = {
  sendOtp: "/auth/send-otp",
  verifyOtp: "/auth/verify-otp",
  register: "/auth/register"
};
const OTP_COOLDOWN_SECONDS = 60;
let otpCooldownTimer = null;

async function apiRequest(path, options = {}){
  const token = localStorage.getItem("medikiosk_token");
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(isFormData ? {} : {"Content-Type": "application/json"}),
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
      ...(options.headers || {})
    },
    ...options
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if(!response.ok){
    if(response.status === 401){
      handleUnauthorized();
    }
    const message = typeof data === "string" ? data : data.message;
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  return data;
}

function handleUnauthorized(){
  ["medikiosk_token","medzyra_access_token","token","authToken","accessToken","medikiosk_current"].forEach(key=>localStorage.removeItem(key));
  currentUser = null;
  if($("dashboardScreen") && $("authScreen")){
    $("dashboardScreen").classList.add("hidden");
    $("authScreen").classList.remove("hidden");
    $("loginForm")?.reset();
    setAuthMode("login");
    toast("Your session expired. Please sign in again.");
  }
}

let users = JSON.parse(localStorage.getItem("medikiosk_users") || "[]");
let currentUser = JSON.parse(localStorage.getItem("medikiosk_current") || "null");
const predefinedAllergies = [
  "Penicillin", "Peanuts", "Shellfish", "Eggs", "Milk", "Soy", "Wheat", "Tree Nuts", "Fish",
  "Latex", "Dust Mites", "Pollen", "Animal Dander", "Mold", "Bee Sting", "Sulfa Drugs", "Aspirin",
  "Ibuprofen", "Tomatoes", "Strawberries"
];

function toast(message){
  const el=$("toast"); el.textContent=message; el.classList.add("show");
  clearTimeout(window.toastTimer); window.toastTimer=setTimeout(()=>el.classList.remove("show"),2600);
}
function saveUsers(){localStorage.setItem("medikiosk_users",JSON.stringify(users));}
function toggleOtpControls(show){
  $("otpSection").classList.toggle("hidden",!show);
  $("loginSubmitBtn").classList.toggle("hidden",!show);
  $("forgotBtn").classList.toggle("hidden",!show);
}
function setOtpCooldown(seconds = OTP_COOLDOWN_SECONDS){
  const endsAt = Date.now() + Math.max(0, Number(seconds)) * 1000;
  localStorage.setItem("medzyra_otp_cooldown_until", String(endsAt));
  clearInterval(otpCooldownTimer);
  const update = () => {
    const remaining = Math.ceil((endsAt - Date.now()) / 1000);
    const buttons = [$("sendOtpBtn"), $("forgotBtn")].filter(Boolean);
    if (remaining <= 0) {
      clearInterval(otpCooldownTimer);
      localStorage.removeItem("medzyra_otp_cooldown_until");
      buttons.forEach(button => {
        button.disabled = false;
        button.textContent = button.id === "forgotBtn" ? "Resend OTP" : "Send OTP";
      });
      return;
    }
    buttons.forEach(button => {
      button.disabled = true;
      button.textContent = `Wait ${remaining}s`;
    });
  };
  update();
  otpCooldownTimer = setInterval(update, 1000);
}
function restoreOtpCooldown(){
  const endsAt = Number(localStorage.getItem("medzyra_otp_cooldown_until") || 0);
  const remaining = Math.ceil((endsAt - Date.now()) / 1000);
  if (remaining > 0) setOtpCooldown(remaining);
  else localStorage.removeItem("medzyra_otp_cooldown_until");
}
async function sendOtp(identifier){
  const sendButton = $("sendOtpBtn");
  if (sendButton?.disabled) return false;
  try{
    const result=await apiRequest(AUTH_ENDPOINTS.sendOtp,{
      method:"POST",
      body:JSON.stringify({identifier})
    });
    $("loginOtp").value="";
    toggleOtpControls(true);
    setOtpCooldown();
    toast(result.message || "OTP sent successfully.");
    $("loginOtp").focus();
    return true;
  }catch(error){
    const waitMatch = String(error.message || "").match(/wait\s+(\d+)\s+seconds?/i);
    if (waitMatch) setOtpCooldown(Number(waitMatch[1]));
    toast(error.message || "Unable to send OTP.");
    return false;
  }
}
function renderAllergySuggestions(){
  const container=$("allergySuggestions");
  if(!container)return;
  container.innerHTML=predefinedAllergies.map(allergy=>`
    <button type="button" class="allergy-chip" data-allergy="${allergy}" style="border:1px solid #cfe3f7; background:#fff; color:#1b4d82; border-radius:999px; padding:6px 10px; font-size:12px; font-weight:600; cursor:pointer;">
      ${allergy}
    </button>
  `).join("");

  container.querySelectorAll(".allergy-chip").forEach(button=>{
    button.onclick=()=>{
      const allergiesField=$("allergies");
      if(!allergiesField)return;
      const existing=(allergiesField.value||"").split(",").map(item=>item.trim()).filter(Boolean);
      const selected=button.dataset.allergy;
      if(!existing.includes(selected)){
        existing.push(selected);
        allergiesField.value=existing.join(", ");
      }
      allergiesField.focus();
    };
  });
}
function calculateAge(dob){
  if(!dob) return "—";
  const birthDate=new Date(dob);
  if(Number.isNaN(birthDate.getTime())) return "—";
  const today=new Date();
  let age=today.getFullYear()-birthDate.getFullYear();
  const monthDiff=today.getMonth()-birthDate.getMonth();
  if(monthDiff<0 || (monthDiff===0 && today.getDate()<birthDate.getDate())) age--;
  return age;
}
function normalizeUser(user = {}){
  const healthProfile=user.healthProfile || user.health_profile || {};
  return {
    ...user,
    id:user.id || user.userId,
    fullName:user.fullName || user.full_name || "User",
    phone:user.phone || "",
    email:user.email || "",
    dob:user.dob || user.dateOfBirth || user.date_of_birth || "",
    bloodGroup:user.bloodGroup || user.blood_group || "",
    emergency:user.emergency || user.emergencyContact || user.emergency_contact || "",
    height:user.height || user.height_cm || healthProfile.height_cm || "Not added",
    weight:user.weight || user.weight_kg || healthProfile.weight_kg || "Not added",
    allergies:user.allergies || healthProfile.allergies || "None",
    smoking:user.smoking || healthProfile.smoking || "Not added",
    drinking:user.drinking || healthProfile.drinking || "Not added",
    exercise:user.exercise || healthProfile.exercise || "Not added",
    chronic:user.chronic || user.chronicConditions || user.chronic_conditions || healthProfile.chronic_conditions || "None",
    appointments:user.appointments || [],
    medicines:user.medicines || [],
    documents:user.documents || []
  };
}

currentUser = currentUser ? normalizeUser(currentUser) : null;
function setAuthMode(mode){
  const login=mode==="login";
  $("loginForm").classList.toggle("hidden",!login);
  $("registerForm").classList.toggle("hidden",login);
  $("authTitle").textContent=login?"Welcome back.":"Create your account.";
  $("authSubtitle").textContent=login?"Sign in to continue your complete health journey.":"Tell us a little about yourself to build your health profile.";
  if(login){
    $("loginOtp").value="";
    toggleOtpControls(false);
  }
  window.scrollTo({top:0,behavior:"smooth"});
}
function showStep(n){
  $("step1").classList.toggle("hidden",n!==1); $("step2").classList.toggle("hidden",n!==2);
  $("stepNumber").textContent=n; $("regProgress").style.width=n===1?"50%":"100%";
}
function validateStep1(){
  const ids=["fullName","phone","email","dob","gender","bloodGroup","city","emergency"];
  for(const id of ids){ if(!$(id).value.trim()){toast("Please complete all required details.");$(id).focus();return false;} }
  if(!$("terms").checked){toast("Please accept the Terms & Conditions.");return false;}
    const phone=$("phone").value.trim().replace(/[\s()-]/g,"");
    const emergency=$("emergency").value.trim().replace(/[\s()-]/g,"");
    if(!/^\+?[1-9]\d{7,14}$/.test(phone)){toast("Enter a valid phone number, including country code when needed.");$("phone").focus();return false;}
    if(!/^\+?[1-9]\d{7,14}$/.test(emergency)){toast("Enter a valid emergency contact number.");$("emergency").focus();return false;}
  return true;
}
$("showRegister").onclick=()=>{setAuthMode("register");showStep(1)};
$("showLogin").onclick=()=>setAuthMode("login");
$("nextStep").onclick=()=>{if(validateStep1())showStep(2)};
$("backStep").onclick=()=>showStep(1);

$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const identifier=$("loginIdentifier").value.trim();
  const otp=$("loginOtp").value.trim();
  if(!otp){toast("Please enter the OTP sent to your registered email or phone."); return}
  try{
    const result=await apiRequest(AUTH_ENDPOINTS.verifyOtp,{
      method:"POST",
      body:JSON.stringify({identifier, otp})
    });
    currentUser=normalizeUser(result.user || result.data || result);
    const token=result.token || result.accessToken || result.data?.accessToken;
    if(token)localStorage.setItem("medikiosk_token",token);
    localStorage.setItem("medikiosk_current",JSON.stringify(currentUser));
    enterDashboard();
  }catch(error){
    toast(error.message || "Invalid OTP. Please try again.");
  }
});

$("sendOtpBtn").onclick=()=>{
  const identifier=$("loginIdentifier").value.trim();
  if(!identifier){toast("Enter your email or phone first."); $("loginIdentifier").focus(); return;}
  sendOtp(identifier);
};

$("loginIdentifier").addEventListener("input",()=>{
  if(!$("loginIdentifier").value.trim()){
    toggleOtpControls(false);
  }
});

$("registerForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const email=$("email").value.trim().toLowerCase(), phone=$("phone").value.trim().replace(/[\s()-]/g,"");
  const emergency=$("emergency").value.trim().replace(/[\s()-]/g,"");
  const user={
    id:Date.now(), fullName:$("fullName").value.trim(), phone, email,
    dateOfBirth:$("dob").value, age:calculateAge($("dob").value), gender:$("gender").value, bloodGroup:$("bloodGroup").value, city:$("city").value.trim(),
      emergencyContact:emergency, termsAccepted:true, height:$("height").value||"Not added",
    weight:$("weight").value||"Not added", allergies:$("allergies").value.trim()||"None",
    smoking:$("smoking").value, drinking:$("drinking").value, exercise:$("exercise").value,
    chronicConditions:$("chronic").value.trim()||"None"
  };
  try{
    const result=await apiRequest(AUTH_ENDPOINTS.register,{
      method:"POST",
      body:JSON.stringify(user)
    });
    currentUser=normalizeUser(result.user || result.data || result);
    const token=result.token || result.accessToken || result.data?.accessToken;
    if(token)localStorage.setItem("medikiosk_token",token);
    localStorage.setItem("medikiosk_current",JSON.stringify(currentUser));
    toast(result.message || "Account created successfully!");
    enterDashboard();
  }catch(error){
    toast(error.message || "Unable to create account.");
  }
});

function enterDashboard(){
  $("authScreen").classList.add("hidden");$("dashboardScreen").classList.remove("hidden");
  renderUser(); showView("home"); loadDocuments();
}
function renderUser(){
  if(!currentUser)return;
  currentUser = normalizeUser(currentUser);
  $("userNameTop").textContent=currentUser.fullName.split(" ")[0];
  $("avatar").textContent=currentUser.fullName.charAt(0).toUpperCase();
  $("healthBlood").textContent=currentUser.bloodGroup;
  $("healthAge").textContent=currentUser.dob ? calculateAge(currentUser.dob) : (currentUser.age || "—");
  $("healthHeight").textContent=currentUser.height==="Not added"?"—":currentUser.height+" cm";
  $("healthWeight").textContent=currentUser.weight==="Not added"?"—":currentUser.weight+" kg";
  $("basicInfo").innerHTML=infoRows([
    ["Full Name",currentUser.fullName],["Email",currentUser.email],["Phone",currentUser.phone],["Date of Birth",currentUser.dob||"Not added"],["Gender",currentUser.gender],["City",currentUser.city]
  ]);
  $("medicalInfo").innerHTML=infoRows([
    ["Blood Group",currentUser.bloodGroup],["Allergies",currentUser.allergies],["Chronic Conditions",currentUser.chronic]
  ]);
  $("lifestyleInfo").innerHTML=infoRows([
    ["Smoking",currentUser.smoking],["Drinking",currentUser.drinking],["Exercise",currentUser.exercise]
  ]);
  $("emergencyInfo").innerHTML=infoRows([["Emergency Contact",currentUser.emergency]]);
  $("setName").value=currentUser.fullName;$("setEmail").value=currentUser.email;
  renderAppointments();renderMedicines();renderDocuments();
}
function infoRows(rows){return rows.map(r=>`<div class="info-row"><span>${r[0]}</span><span>${escapeHTML(String(r[1]))}</span></div>`).join("")}
function escapeHTML(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

function showView(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
  $("view"+view.charAt(0).toUpperCase()+view.slice(1)).classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
}
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>showView(b.dataset.view));
document.querySelectorAll("[data-view-jump]").forEach(b=>b.onclick=()=>showView(b.dataset.viewJump));
document.querySelectorAll("[data-route]").forEach(b=>b.onclick=()=>{window.location.href=b.dataset.route});

$("bookBtn").onclick=()=>{
  const date=$("apptDate").value,time=$("apptTime").value,dept=$("apptDept").value;
  if(!date||!time){toast("Select an appointment date and time.");return}
  currentUser.appointments.push({id:Date.now(),dept,date,time});
  syncCurrent();renderAppointments();toast("Appointment booked successfully.");
};
function renderAppointments(){
  const list=$("appointmentList");
  if(!currentUser?.appointments?.length){list.innerHTML='<div class="empty-state" style="padding:35px"><span>▣</span><h3>No upcoming appointments</h3><p>Your booked appointments will appear here.</p></div>';return}
  list.innerHTML=currentUser.appointments.map(a=>`<div class="list-item"><div><b>${escapeHTML(a.dept)}</b><small>${a.date} • ${a.time}</small></div><button class="delete-btn" onclick="deleteAppointment(${a.id})">Cancel</button></div>`).join("");
}
window.deleteAppointment=id=>{currentUser.appointments=currentUser.appointments.filter(a=>a.id!==id);syncCurrent();renderAppointments();toast("Appointment cancelled.")};

$("docInput").onchange=async e=>{
  const file=e.target.files[0];
  if(!file)return;
  if(file.size > 10 * 1024 * 1024){toast("Files must be smaller than 10MB.");e.target.value="";return;}
  try{
    const formData=new FormData();
    formData.append("document",file);
    toast("Uploading document...");
    const uploadResult=await apiRequest("/documents/upload",{method:"POST",body:formData});
    const uploaded=uploadResult.document;
    currentUser.documents=[uploaded,...(currentUser.documents||[])];
    renderDocuments();
    toast("Document uploaded successfully.");

    if(file.type.startsWith("image/")){
      toast("Analyzing document...");
      await apiRequest(`/documents/${uploaded.id}/process`,{method:"POST"});
      toast("Document analyzed successfully.");
      await loadDocuments();
    }
  }catch(error){
    toast(error.message || "Document upload failed.");
  }finally{
    e.target.value="";
  }
};
async function loadDocuments(){
  try{
    const result=await apiRequest("/documents/recent");
    currentUser.documents=result.documents || [];
    renderDocuments();
  }catch(error){
    if(error.message !== "Authorization token required") toast(error.message || "Unable to load documents.");
  }
}
function renderDocuments(){
  const list=$("documentList");
  if(!currentUser?.documents?.length){list.innerHTML="";return}
  list.innerHTML=currentUser.documents.map(d=>`<div class="list-item"><div><b>▤ ${escapeHTML(d.file_name || d.name)}</b><small>${formatDocumentSize(d.file_size || 0)} • ${escapeHTML(d.status || "uploaded")}</small></div><button class="delete-btn" onclick="deleteDocument('${d.id}')">Remove</button></div>`).join("");
}
function formatDocumentSize(bytes){
  if(!bytes)return "Size unavailable";
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
window.deleteDocument=async id=>{
  try{
    await apiRequest(`/documents/${id}`,{method:"DELETE"});
    currentUser.documents=currentUser.documents.filter(d=>d.id!==id);
    renderDocuments();
    toast("Document removed.");
  }catch(error){toast(error.message || "Unable to remove document.");}
};

$("addMedBtn").onclick=()=>{
  const name=$("medName").value.trim(),dose=$("medDose").value.trim(),time=$("medTime").value;
  if(!name||!dose||!time){toast("Enter medicine, dosage and time.");return}
  currentUser.medicines.push({id:Date.now(),name,dose,time});
  syncCurrent();renderMedicines();$("medName").value="";$("medDose").value="";$("medTime").value="";toast("Medicine added.");
};
function renderMedicines(){
  const list=$("medicineList");
  if(!currentUser?.medicines?.length){list.innerHTML='<div class="empty-state" style="padding:35px"><span>◷</span><h3>No medicines added</h3><p>Add your regular medicines above.</p></div>';return}
  list.innerHTML=currentUser.medicines.map(m=>`<div class="list-item"><div><b>${escapeHTML(m.name)}</b><small>${escapeHTML(m.dose)} • ${m.time}</small></div><button class="delete-btn" onclick="deleteMedicine(${m.id})">Remove</button></div>`).join("");
}
window.deleteMedicine=id=>{currentUser.medicines=currentUser.medicines.filter(m=>m.id!==id);syncCurrent();renderMedicines();toast("Medicine removed.")};

$("saveSettings").onclick=()=>{
  const name=$("setName").value.trim(),email=$("setEmail").value.trim().toLowerCase();
  if(!name||!email){toast("Name and email are required.");return}
  currentUser.fullName=name;currentUser.email=email;syncCurrent();renderUser();toast("Settings saved.");
};
function syncCurrent(){
  const i=users.findIndex(u=>u.id===currentUser.id);if(i>-1)users[i]=currentUser;
  saveUsers();localStorage.setItem("medikiosk_current",JSON.stringify(currentUser));
}
$("logoutBtn").onclick=()=>{localStorage.removeItem("medikiosk_current");localStorage.removeItem("medikiosk_token");currentUser=null;$("dashboardScreen").classList.add("hidden");$("authScreen").classList.remove("hidden");$("loginForm").reset();setAuthMode("login");toast("Logged out successfully.")};
$("forgotBtn").onclick=()=>{
  const identifier=$("loginIdentifier").value.trim();
  if(!identifier){toast("Enter your email or phone first."); $("loginIdentifier").focus(); return;}
  sendOtp(identifier);
};
$("assistantBtn").onclick=()=>{ window.location.href="../Health Chat/health-chat.html"; };
$("addFamilyBtn").onclick=()=>toast("Family member module is ready for integration.");

renderAllergySuggestions();
restoreOtpCooldown();
const cameFromRole = new URLSearchParams(window.location.search).get("from") === "role";
if(currentUser && !cameFromRole)enterDashboard();
else setAuthMode("login");
