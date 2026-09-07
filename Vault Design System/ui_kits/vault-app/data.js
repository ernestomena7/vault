window.VaultData = {
  currentUser: { name: 'Marta Reyes', email: 'marta@company.com', role: 'Admin' },
  stats: [
    { label: 'Uploads this week', value: '48', icon: 'upload-cloud' },
    { label: 'Pending approvals', value: '6', icon: 'clock' },
    { label: 'Storage used', value: '812 GB', icon: 'hard-drive' },
    { label: 'Active stream links', value: '13', icon: 'play' },
  ],
  uploads: [
    { id: 1, name: 'onboarding_2026-09-02_v3.mp4', folder: '/marketing/q3-launch', owner: 'Marta Reyes', size: '1.2 GB', duration: '04:12', status: 'approved' },
    { id: 2, name: 'q3_recap_final.mov', folder: '/leadership/all-hands', owner: 'Devon Lee', size: '3.4 GB', duration: '18:40', status: 'pending' },
    { id: 3, name: 'raw_capture_09.mkv', folder: '/product/demo-reel', owner: 'Priya Nair', size: '640 MB', duration: '02:05', status: 'rejected' },
    { id: 4, name: 'support_faq_update.mp4', folder: '/support/training', owner: 'Jonas Kim', size: '980 MB', duration: '07:33', status: 'processing' },
    { id: 5, name: 'brand_refresh_teaser.mov', folder: '/marketing/q3-launch', owner: 'Marta Reyes', size: '2.1 GB', duration: '01:12', status: 'approved' },
  ],
  approvalQueue: [
    { id: 2, name: 'q3_recap_final.mov', folder: '/leadership/all-hands', owner: 'Devon Lee', submitted: '2h ago' },
    { id: 4, name: 'support_faq_update.mp4', folder: '/support/training', owner: 'Jonas Kim', submitted: '5h ago' },
    { id: 6, name: 'partner_webinar_raw.mp4', folder: '/marketing/webinars', owner: 'Priya Nair', submitted: '1d ago' },
  ],
  users: [
    { name: 'Marta Reyes', email: 'marta@company.com', role: 'Admin', active: true },
    { name: 'Devon Lee', email: 'devon@company.com', role: 'Approver', active: true },
    { name: 'Priya Nair', email: 'priya@company.com', role: 'Uploader', active: true },
    { name: 'Jonas Kim', email: 'jonas@company.com', role: 'Uploader', active: false },
  ],
  namingTemplates: [
    { value: 'std', label: '{project}_{date}_v{n}' },
    { value: 'alt', label: '{date}_{project}_{owner}' },
    { value: 'raw', label: 'raw_{project}_{n}' },
  ],
};
