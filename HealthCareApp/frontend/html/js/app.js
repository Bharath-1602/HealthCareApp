// HealthCare App — Main Application Logic
const API_BASE = '';  // proxied via nginx

// ---- State ----
let currentUser = null;
let currentToken = null;
let currentPage = 'dashboard';

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  currentToken = localStorage.getItem('hc_token');
  const userData = localStorage.getItem('hc_user');
  if (currentToken && userData) {
    currentUser = JSON.parse(userData);
    showApp();
  } else {
    showAuth();
  }
});

// ---- API Helpers ----
async function api(method, url, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (currentToken) opts.headers['Authorization'] = `Bearer ${currentToken}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${url}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function toast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span> ${message}`;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ---- Auth ----
function showAuth() {
  document.getElementById('authPage').style.display = 'flex';
  document.getElementById('appPage').style.display = 'none';
}

function showApp() {
  document.getElementById('authPage').style.display = 'none';
  document.getElementById('appPage').style.display = 'flex';
  document.getElementById('userDisplayName').textContent = currentUser.full_name;
  document.getElementById('userDisplayRole').textContent = currentUser.role;
  document.getElementById('userAvatarText').textContent = currentUser.full_name.charAt(0).toUpperCase();

  // Show/hide admin nav
  const adminNav = document.getElementById('navAdmin');
  if (currentUser.role === 'admin') {
    adminNav.style.display = 'flex';
  } else {
    adminNav.style.display = 'none';
  }

  navigateTo('dashboard');
}

function showLogin() {
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('authLoginTab').classList.add('active');
  document.getElementById('authRegisterTab').classList.remove('active');
}

function showRegister() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
  document.getElementById('authLoginTab').classList.remove('active');
  document.getElementById('authRegisterTab').classList.add('active');
}

async function handleLogin(e) {
  e.preventDefault();
  try {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const data = await api('POST', '/api/auth/login', { username, password });
    currentToken = data.token;
    currentUser = data.user;
    localStorage.setItem('hc_token', currentToken);
    localStorage.setItem('hc_user', JSON.stringify(currentUser));
    toast('Welcome back, ' + currentUser.full_name + '!');
    showApp();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  try {
    const body = {
      username: document.getElementById('regUsername').value,
      email: document.getElementById('regEmail').value,
      password: document.getElementById('regPassword').value,
      full_name: document.getElementById('regFullName').value,
      phone: document.getElementById('regPhone').value,
      role: document.getElementById('regRole').value
    };
    await api('POST', '/api/auth/register', body);
    toast('Account created! Please login.');
    showLogin();
  } catch (err) {
    toast(err.message, 'error');
  }
}

function logout() {
  localStorage.removeItem('hc_token');
  localStorage.removeItem('hc_user');
  currentToken = null;
  currentUser = null;
  showAuth();
  toast('Logged out', 'info');
}

// ---- Navigation ----
function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const section = document.getElementById('page-' + page);
  if (section) section.classList.add('active');
  const navLink = document.querySelector(`[data-page="${page}"]`);
  if (navLink) navLink.classList.add('active');
  document.getElementById('pageTitle').textContent = getPageTitle(page);

  // Load page data
  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'doctors': loadDoctors(); break;
    case 'appointments': loadAppointments(); break;
    case 'registrations': loadRegistrations(); break;
    case 'vitals': loadVitals(); break;
    case 'forum': loadForum(); break;
    case 'complaints': loadComplaints(); break;
    case 'admin': loadAdmin(); break;
  }
}

function getPageTitle(page) {
  const titles = {
    dashboard: 'Dashboard',
    doctors: 'Doctors',
    appointments: 'Appointments',
    registrations: 'Patient Registration',
    vitals: 'Vital Signs',
    forum: 'Community Forum',
    complaints: 'Complaints',
    admin: 'Admin Dashboard'
  };
  return titles[page] || 'Dashboard';
}

// ---- Dashboard ----
async function loadDashboard() {
  try {
    const stats = await api('GET', '/api/admin/stats');
    document.getElementById('statUsers').textContent = stats.users || 0;
    document.getElementById('statDoctors').textContent = stats.doctors || 0;
    document.getElementById('statAppointments').textContent = stats.appointments || 0;
    document.getElementById('statRegistrations').textContent = stats.registrations || 0;
    document.getElementById('statVitals').textContent = stats.vitals || 0;
    document.getElementById('statPosts').textContent = stats.posts || 0;
    document.getElementById('statComplaints').textContent = stats.complaints || 0;
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

// ---- Doctors ----
async function loadDoctors() {
  try {
    const doctors = await api('GET', '/api/doctors/');
    const tbody = document.getElementById('doctorsTableBody');
    if (doctors.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No doctors found</td></tr>';
      return;
    }
    tbody.innerHTML = doctors.map(d => `
      <tr>
        <td><strong>${d.full_name}</strong></td>
        <td>${d.specialization}</td>
        <td>${d.qualification || '-'}</td>
        <td>${d.experience_years} yrs</td>
        <td>$${d.consultation_fee}</td>
        <td><span class="badge ${d.status === 'active' ? 'badge-success' : 'badge-danger'}">${d.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="viewSchedule(${d.id})">📅 Schedule</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    toast('Failed to load doctors', 'error');
  }
}

async function viewSchedule(doctorId) {
  try {
    const schedules = await api('GET', `/api/doctors/${doctorId}/schedule`);
    const doctor = await api('GET', `/api/doctors/${doctorId}`);
    let html = `<h5 style="margin-bottom:16px;">${doctor.full_name}'s Schedule</h5>`;
    if (schedules.length === 0) {
      html += '<p class="text-muted">No schedule available</p>';
    } else {
      html += '<div class="table-container"><table><thead><tr><th>Day</th><th>Start</th><th>End</th><th>Max Patients</th></tr></thead><tbody>';
      schedules.forEach(s => {
        html += `<tr><td>${s.day_of_week}</td><td>${s.start_time}</td><td>${s.end_time}</td><td>${s.max_patients}</td></tr>`;
      });
      html += '</tbody></table></div>';
    }
    openModal('Doctor Schedule', html);
  } catch (err) {
    toast('Failed to load schedule', 'error');
  }
}

// ---- Appointments ----
async function loadAppointments() {
  try {
    const appointments = await api('GET', '/api/appointments/');
    const tbody = document.getElementById('appointmentsTableBody');
    if (appointments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No appointments found</td></tr>';
      return;
    }
    tbody.innerHTML = appointments.map(a => `
      <tr>
        <td>${a.patient_name}</td>
        <td>${a.doctor_name || 'N/A'}</td>
        <td>${new Date(a.appointment_date).toLocaleDateString()}</td>
        <td>${a.appointment_time}</td>
        <td>${a.reason || '-'}</td>
        <td><span class="badge ${getStatusBadge(a.status)}">${a.status}</span></td>
        <td>
          <button class="btn btn-sm btn-success" onclick="updateAppointmentStatus(${a.id}, 'confirmed')">✓</button>
          <button class="btn btn-sm btn-danger" onclick="updateAppointmentStatus(${a.id}, 'cancelled')">✕</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    toast('Failed to load appointments', 'error');
  }
}

function getStatusBadge(status) {
  const map = {
    'scheduled': 'badge-info', 'confirmed': 'badge-success', 'completed': 'badge-success',
    'cancelled': 'badge-danger', 'no-show': 'badge-warning',
    'registered': 'badge-info', 'in-progress': 'badge-warning',
    'open': 'badge-info', 'resolved': 'badge-success', 'closed': 'badge-purple'
  };
  return map[status] || 'badge-info';
}

async function showBookAppointment() {
  try {
    const doctors = await api('GET', '/api/doctors/');
    let doctorOptions = doctors.map(d => `<option value="${d.id}" data-name="${d.full_name}">${d.full_name} — ${d.specialization}</option>`).join('');
    const html = `
      <form id="bookApptForm" onsubmit="handleBookAppointment(event)">
        <div class="form-group">
          <label class="form-label">Doctor</label>
          <select class="form-control" id="apptDoctor" required>${doctorOptions}</select>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Date</label>
            <input type="date" class="form-control" id="apptDate" required>
          </div>
          <div class="form-group">
            <label class="form-label">Time</label>
            <input type="time" class="form-control" id="apptTime" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Reason</label>
          <textarea class="form-control" id="apptReason" placeholder="Describe your symptoms or reason for visit..."></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">Book Appointment</button>
      </form>
    `;
    openModal('Book Appointment', html);
  } catch (err) {
    toast('Failed to load doctors', 'error');
  }
}

async function handleBookAppointment(e) {
  e.preventDefault();
  try {
    const doctorSelect = document.getElementById('apptDoctor');
    const body = {
      patient_id: currentUser.id,
      patient_name: currentUser.full_name,
      doctor_id: doctorSelect.value,
      doctor_name: doctorSelect.options[doctorSelect.selectedIndex].getAttribute('data-name'),
      appointment_date: document.getElementById('apptDate').value,
      appointment_time: document.getElementById('apptTime').value,
      reason: document.getElementById('apptReason').value
    };
    await api('POST', '/api/appointments/', body);
    toast('Appointment booked successfully!');
    closeModal();
    loadAppointments();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function updateAppointmentStatus(id, status) {
  try {
    await api('PUT', `/api/appointments/${id}`, { status });
    toast(`Appointment ${status}`);
    loadAppointments();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---- Registrations ----
async function loadRegistrations() {
  try {
    const registrations = await api('GET', '/api/registrations/');
    const tbody = document.getElementById('registrationsTableBody');
    if (registrations.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No registrations found</td></tr>';
      return;
    }
    tbody.innerHTML = registrations.map(r => `
      <tr>
        <td>${r.patient_name}</td>
        <td>${r.doctor_name || 'N/A'}</td>
        <td>${new Date(r.registration_date).toLocaleDateString()}</td>
        <td>${r.reason || '-'}</td>
        <td><span class="badge ${getStatusBadge(r.status)}">${r.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="updateRegistrationStatus(${r.id}, 'completed')">Complete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    toast('Failed to load registrations', 'error');
  }
}

async function showRegisterPatient() {
  try {
    const doctors = await api('GET', '/api/doctors/');
    let doctorOptions = doctors.map(d => `<option value="${d.id}" data-name="${d.full_name}">${d.full_name} — ${d.specialization}</option>`).join('');
    const html = `
      <form onsubmit="handleRegisterPatient(event)">
        <div class="form-group">
          <label class="form-label">Doctor</label>
          <select class="form-control" id="regDocDoctor" required>${doctorOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Reason</label>
          <textarea class="form-control" id="regDocReason" placeholder="Reason for registration..."></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">Register</button>
      </form>
    `;
    openModal('Register with Doctor', html);
  } catch (err) {
    toast('Failed to load doctors', 'error');
  }
}

async function handleRegisterPatient(e) {
  e.preventDefault();
  try {
    const doctorSelect = document.getElementById('regDocDoctor');
    const body = {
      patient_id: currentUser.id,
      patient_name: currentUser.full_name,
      doctor_id: doctorSelect.value,
      doctor_name: doctorSelect.options[doctorSelect.selectedIndex].getAttribute('data-name'),
      reason: document.getElementById('regDocReason').value
    };
    await api('POST', '/api/registrations/', body);
    toast('Registration successful!');
    closeModal();
    loadRegistrations();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function updateRegistrationStatus(id, status) {
  try {
    await api('PUT', `/api/registrations/${id}`, { status });
    toast('Registration updated');
    loadRegistrations();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---- Vitals ----
async function loadVitals() {
  try {
    const vitals = await api('GET', '/api/vitals/');
    const tbody = document.getElementById('vitalsTableBody');
    if (vitals.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No vital signs recorded</td></tr>';
      return;
    }
    tbody.innerHTML = vitals.map(v => `
      <tr>
        <td>${v.patient_name || 'Patient #' + v.patient_id}</td>
        <td>${v.blood_pressure_systolic || '-'}/${v.blood_pressure_diastolic || '-'}</td>
        <td>${v.heart_rate || '-'}</td>
        <td>${v.temperature || '-'}°</td>
        <td>${v.oxygen_saturation || '-'}%</td>
        <td>${v.blood_sugar || '-'}</td>
        <td>${new Date(v.recorded_at).toLocaleString()}</td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteVital(${v.id})">🗑</button></td>
      </tr>
    `).join('');
  } catch (err) {
    toast('Failed to load vitals', 'error');
  }
}

function showAddVital() {
  const html = `
    <form onsubmit="handleAddVital(event)">
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">BP Systolic</label>
          <input type="number" class="form-control" id="vBPSys" placeholder="120">
        </div>
        <div class="form-group">
          <label class="form-label">BP Diastolic</label>
          <input type="number" class="form-control" id="vBPDia" placeholder="80">
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Heart Rate (bpm)</label>
          <input type="number" class="form-control" id="vHR" placeholder="72">
        </div>
        <div class="form-group">
          <label class="form-label">Temperature (°F)</label>
          <input type="number" step="0.1" class="form-control" id="vTemp" placeholder="98.6">
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">O₂ Saturation (%)</label>
          <input type="number" step="0.1" class="form-control" id="vO2" placeholder="98">
        </div>
        <div class="form-group">
          <label class="form-label">Blood Sugar</label>
          <input type="number" step="0.1" class="form-control" id="vBS" placeholder="100">
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Weight (kg)</label>
          <input type="number" step="0.1" class="form-control" id="vWeight" placeholder="70">
        </div>
        <div class="form-group">
          <label class="form-label">Height (cm)</label>
          <input type="number" step="0.1" class="form-control" id="vHeight" placeholder="170">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-control" id="vNotes" placeholder="Any additional notes..."></textarea>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%">Record Vitals</button>
    </form>
  `;
  openModal('Record Vital Signs', html);
}

async function handleAddVital(e) {
  e.preventDefault();
  try {
    const body = {
      patient_id: currentUser.id,
      patient_name: currentUser.full_name,
      user_id: currentUser.id,
      blood_pressure_systolic: document.getElementById('vBPSys').value || null,
      blood_pressure_diastolic: document.getElementById('vBPDia').value || null,
      heart_rate: document.getElementById('vHR').value || null,
      temperature: document.getElementById('vTemp').value || null,
      oxygen_saturation: document.getElementById('vO2').value || null,
      blood_sugar: document.getElementById('vBS').value || null,
      weight: document.getElementById('vWeight').value || null,
      height: document.getElementById('vHeight').value || null,
      notes: document.getElementById('vNotes').value
    };
    await api('POST', '/api/vitals/', body);
    toast('Vital signs recorded!');
    closeModal();
    loadVitals();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function deleteVital(id) {
  if (!confirm('Delete this vital record?')) return;
  try {
    await api('DELETE', `/api/vitals/${id}`);
    toast('Record deleted');
    loadVitals();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---- Forum ----
async function loadForum() {
  try {
    const posts = await api('GET', '/api/posts/');
    const container = document.getElementById('forumPosts');
    if (posts.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><p>No posts yet. Start the conversation!</p></div>';
      return;
    }
    container.innerHTML = posts.map(p => `
      <div class="post-card animate-in">
        <div class="post-header">
          <div class="post-avatar">${(p.author_name || 'U').charAt(0)}</div>
          <div class="post-meta">
            <div class="post-author">${p.author_name}</div>
            <div class="post-date">${new Date(p.created_at).toLocaleString()} · <span class="badge badge-purple">${p.category}</span></div>
          </div>
        </div>
        <div class="post-title">${p.title}</div>
        <div class="post-content">${p.content}</div>
        <div class="post-actions">
          <button onclick="likePost(${p.id})">❤️ ${p.likes_count} Likes</button>
          <button onclick="viewPost(${p.id})">💬 Comments</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    toast('Failed to load forum', 'error');
  }
}

function showCreatePost() {
  const html = `
    <form onsubmit="handleCreatePost(event)">
      <div class="form-group">
        <label class="form-label">Title</label>
        <input type="text" class="form-control" id="postTitle" required placeholder="Post title...">
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-control" id="postCategory">
          <option value="general">General</option>
          <option value="health-tips">Health Tips</option>
          <option value="news">News</option>
          <option value="question">Question</option>
          <option value="announcement">Announcement</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Content</label>
        <textarea class="form-control" id="postContent" required placeholder="Share your thoughts..." style="min-height:150px"></textarea>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%">Publish Post</button>
    </form>
  `;
  openModal('Create Post', html);
}

async function handleCreatePost(e) {
  e.preventDefault();
  try {
    const body = {
      user_id: currentUser.id,
      author_name: currentUser.full_name,
      title: document.getElementById('postTitle').value,
      content: document.getElementById('postContent').value,
      category: document.getElementById('postCategory').value
    };
    await api('POST', '/api/posts/', body);
    toast('Post published!');
    closeModal();
    loadForum();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function likePost(id) {
  try {
    await api('POST', `/api/posts/${id}/like`);
    loadForum();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function viewPost(id) {
  try {
    const post = await api('GET', `/api/posts/${id}`);
    let commentsHtml = '';
    if (post.comments && post.comments.length > 0) {
      commentsHtml = post.comments.map(c => `
        <div style="padding:12px;background:var(--bg-primary);border-radius:8px;margin-bottom:8px;">
          <strong>${c.author_name}</strong> <span style="color:var(--text-muted);font-size:0.75rem;">${new Date(c.created_at).toLocaleString()}</span>
          <p style="margin-top:4px;color:var(--text-secondary)">${c.content}</p>
        </div>
      `).join('');
    } else {
      commentsHtml = '<p style="color:var(--text-muted)">No comments yet</p>';
    }
    const html = `
      <div class="post-title" style="margin-bottom:8px;">${post.title}</div>
      <div class="post-content">${post.content}</div>
      <hr style="border-color:var(--border-color);margin:16px 0">
      <h5 style="margin-bottom:12px;">Comments</h5>
      ${commentsHtml}
      <form onsubmit="handleAddComment(event, ${id})" style="margin-top:16px;">
        <div class="form-group">
          <textarea class="form-control" id="commentContent" placeholder="Write a comment..." required></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Add Comment</button>
      </form>
    `;
    openModal(`Post by ${post.author_name}`, html);
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function handleAddComment(e, postId) {
  e.preventDefault();
  try {
    const body = {
      user_id: currentUser.id,
      author_name: currentUser.full_name,
      content: document.getElementById('commentContent').value
    };
    await api('POST', `/api/posts/${postId}/comments`, body);
    toast('Comment added!');
    viewPost(postId);
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---- Complaints ----
async function loadComplaints() {
  try {
    const complaints = await api('GET', '/api/complaints/');
    const tbody = document.getElementById('complaintsTableBody');
    if (complaints.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No complaints found</td></tr>';
      return;
    }
    tbody.innerHTML = complaints.map(c => `
      <tr>
        <td>${c.user_name}</td>
        <td><strong>${c.subject}</strong></td>
        <td><span class="badge badge-purple">${c.category}</span></td>
        <td><span class="badge ${c.priority === 'critical' ? 'badge-danger' : c.priority === 'high' ? 'badge-warning' : 'badge-info'}">${c.priority}</span></td>
        <td><span class="badge ${getStatusBadge(c.status)}">${c.status}</span></td>
        <td>${new Date(c.created_at).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="updateComplaintStatus(${c.id}, 'resolved')">Resolve</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    toast('Failed to load complaints', 'error');
  }
}

function showFileComplaint() {
  const html = `
    <form onsubmit="handleFileComplaint(event)">
      <div class="form-group">
        <label class="form-label">Subject</label>
        <input type="text" class="form-control" id="compSubject" required placeholder="Brief subject...">
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-control" id="compCategory">
            <option value="service">Service</option>
            <option value="staff">Staff</option>
            <option value="facility">Facility</option>
            <option value="billing">Billing</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select class="form-control" id="compPriority">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-control" id="compDescription" required placeholder="Describe your complaint in detail..."></textarea>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%">Submit Complaint</button>
    </form>
  `;
  openModal('File a Complaint', html);
}

async function handleFileComplaint(e) {
  e.preventDefault();
  try {
    const body = {
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      subject: document.getElementById('compSubject').value,
      description: document.getElementById('compDescription').value,
      category: document.getElementById('compCategory').value,
      priority: document.getElementById('compPriority').value
    };
    await api('POST', '/api/complaints/', body);
    toast('Complaint submitted!');
    closeModal();
    loadComplaints();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function updateComplaintStatus(id, status) {
  try {
    await api('PUT', `/api/complaints/${id}`, { status });
    toast('Complaint updated');
    loadComplaints();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---- Admin ----
async function loadAdmin() {
  try {
    const stats = await api('GET', '/api/admin/stats');
    const health = await api('GET', '/api/admin/health');
    document.getElementById('adminStats').innerHTML = `
      <div class="stat-card"><div class="stat-icon purple">👥</div><div class="stat-value">${stats.users}</div><div class="stat-label">Total Users</div></div>
      <div class="stat-card"><div class="stat-icon green">🩺</div><div class="stat-value">${stats.doctors}</div><div class="stat-label">Doctors</div></div>
      <div class="stat-card"><div class="stat-icon blue">📅</div><div class="stat-value">${stats.appointments}</div><div class="stat-label">Appointments</div></div>
      <div class="stat-card"><div class="stat-icon orange">📋</div><div class="stat-value">${stats.registrations}</div><div class="stat-label">Registrations</div></div>
      <div class="stat-card"><div class="stat-icon teal">❤️</div><div class="stat-value">${stats.vitals}</div><div class="stat-label">Vital Records</div></div>
      <div class="stat-card"><div class="stat-icon pink">💬</div><div class="stat-value">${stats.posts}</div><div class="stat-label">Forum Posts</div></div>
      <div class="stat-card"><div class="stat-icon red">⚠️</div><div class="stat-value">${stats.complaints}</div><div class="stat-label">Complaints</div></div>
    `;

    document.getElementById('serviceHealth').innerHTML = health.services.map(s => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:var(--bg-primary);border-radius:8px;margin-bottom:8px;">
        <span style="font-weight:600">${s.name}</span>
        <span class="badge ${s.status === 'up' ? 'badge-success' : 'badge-danger'}">${s.status}</span>
      </div>
    `).join('');
  } catch (err) {
    console.error('Admin load error:', err);
  }
}

// ---- Modal ----
function openModal(title, contentHtml) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBodyContent').innerHTML = contentHtml;
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}
