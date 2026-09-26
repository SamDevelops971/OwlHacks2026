// api.js — include this on every page: <script src="api.js"></script>
// Assumes the backend is serving the frontend (see server.js), so
// everything is same-origin and no base URL is needed.

function getCookie(name) {
  return document.cookie.split('; ').find(r => r.startsWith(name + '='))?.split('=')[1];
}

async function apiGet(path) {
  const res = await fetch(path, { credentials: 'include' });
  return res.json();
}

async function apiSend(path, method, body) {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': getCookie('csrfToken'),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

const api = {
  signup: (username, email, password) => apiSend('/auth/signup', 'POST', { username, email, password }),
  login: (email, password) => apiSend('/auth/login', 'POST', { email, password }),
  logout: () => apiSend('/auth/logout', 'POST'),
  me: () => apiGet('/auth/me'),

  listClubs: () => apiGet('/clubs'),
  getClub: (id) => apiGet(`/clubs/${id}`),

  listFeed: () => apiGet('/posts'),
  listClubPosts: (clubId) => apiGet(`/clubs/${clubId}/posts`),
  createPost: (clubId, title, body) => apiSend(`/clubs/${clubId}/posts`, 'POST', { title, body }),

  upvote: (postId) => apiSend(`/posts/${postId}/upvote`, 'POST'),
  downvote: (postId) => apiSend(`/posts/${postId}/downvote`, 'POST'),

  listComments: (postId) => apiGet(`/posts/${postId}/comments`),
  addComment: (postId, body) => apiSend(`/posts/${postId}/comments`, 'POST', { body }),
};