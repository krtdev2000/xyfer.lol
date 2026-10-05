const discordId = '1398560521032306788';

fetch(`https://api.lanyard.rest/v1/users/${discordId}`)
  .then(response => response.ok ? response.json() : Promise.reject())
  .then(({data}) => {
    const user = data.discord_user;
    const avatar = document.querySelector('#discord-avatar');
    const name = document.querySelector('#discord-name');
    const status = document.querySelector('#discord-status');
    if (user.avatar) avatar.src = `https://cdn.discordapp.com/avatars/${discordId}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'webp'}?size=256`;
    name.textContent = user.global_name || 'praisekrt';
    status.className = `status ${data.discord_status}`;
  })
  .catch(() => {});
