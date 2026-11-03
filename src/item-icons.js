const icons=[
'<path d="M4 7h16v10H4z" fill="#ad7247" stroke="#e0aa70" stroke-width="1.7"/><path d="M7 7V17M17 7V17" stroke="#633e2b" stroke-width="2"/><circle cx="12" cy="12" r="3.5" stroke="#f2c49a" stroke-width="1.4" fill="none"/><circle cx="12" cy="12" r="1.4" fill="#f8d8b2"/>',
'<path d="M3 16 8 6 15 5 21 13 18 19H7z" fill="#9ca9ae" stroke="#d7e4e5" stroke-width="1.5"/><path d="M8 6 11 13 7 19M11 13l10 0" stroke="#667983" stroke-width="1.5" fill="none"/>',
'<path d="m12 2 7 9-7 11-7-11z" fill="#69b9c9" stroke="#c2f4fa" stroke-width="1.5"/><path d="M12 2v20M5 11h14M12 2 5 11l7 2 7-2z" stroke="#276d90" stroke-width="1.4" fill="none"/>',
'<path d="M3 18c4-8 5-10 9-10 4 0 6 6 9 10z" fill="#e6c98b" stroke="#ffe9af" stroke-width="1.6"/><path d="M5 17q5-3 10 0M9 13l2-.7m4 2 2-1" stroke="#a88e5d" stroke-width="1.3" fill="none"/>',
'<path d="M12 22V3M12 8 7 5M12 11l5-5M12 15l-5-5M12 18l5-5" stroke="#e7c877" stroke-width="1.7" fill="none"/><path d="m6 4 2-2 2 4-2 2zm11 1 2-2 1 4-2 2zm-12 5 2-2 2 4-2 2zm12 1 2-2 2 4-2 2z" fill="#f3d66e"/>',
'<path d="M3 6h18v4H3zm0 5h18v4H3zm0 5h18v4H3z" fill="#ad794d" stroke="#edc493" stroke-width="1.2"/><path d="M7 6v14m10-14v14" stroke="#784623" stroke-width="1.4"/>',
'<path d="M3 9h18v11H3z" fill="#a2a8a5" stroke="#d3dcd6" stroke-width="1.6"/><path d="M3 9 8 4h13v16M8 4v5M8 9v11" stroke="#5e7375" stroke-width="1.3" fill="none"/>',
'<path d="M4 10h16l-2 10H6z" fill="#9cc3d0" stroke="#e0f7fa" stroke-width="1.5"/><path d="M4 10 7 5h10l3 5M7 5h10l-1 5H8z" fill="#dbeefa" stroke="#517985" stroke-width="1.2"/>',
'<path d="M6 3h12v3l-2 4v9c0 3-8 3-8 0v-9L6 6z" fill="#70bad0" fill-opacity=".45" stroke="#d3f9ff" stroke-width="1.8"/><path d="M8 10h8M9 17h6" stroke="#91e4f2" stroke-width="1.4"/>',
'<path d="M6 5h12l2 15H4z" fill="#efe1b2" stroke="#fef6d7" stroke-width="1.6"/><path d="M7 8h10M8 12h8M9 16h6" stroke="#c5aa6a" stroke-width="1.4"/>'
];
export function inventoryIcon(type){
  return '<svg class="resource-art" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'+icons[Math.max(0,Math.min(9,type|0))]+'</svg>';
}
