// Firebase SDK v12 모듈 가져오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-analytics.js";
import { 
    getFirestore, collection, doc, getDoc, setDoc, addDoc, getDocs, query, where, orderBy 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCcmCvdb_C31R33KZD9D2prO5gzgZww6hA",
    authDomain: "ranking-ef53a.firebaseapp.com",
    projectId: "ranking-ef53a",
    storageBucket: "ranking-ef53a.firebasestorage.app",
    messagingSenderId: "984475808193",
    appId: "1:984475808193:web:c812e29590363f4ae2ff40",
    measurementId: "G-K4B64FRKVP"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// DOM 요소 가져오기
const addPlayerBtn = document.getElementById('addPlayerBtn');
const addScoreBtn = document.getElementById('addScoreBtn');
const searchPlayerInput = document.getElementById('searchPlayerInput'); // 검색창
const scoreModal = document.getElementById('scoreModal');
const historyModal = document.getElementById('historyModal');
const passwordModal = document.getElementById('passwordModal');
const closeBtns = document.querySelectorAll('.close-btn');
const scoreForm = document.getElementById('scoreForm');
const participantsSelect = document.getElementById('participants');
const playerDatalist = document.getElementById('player-list');
const playerDatalistSearch = document.getElementById('player-list-search'); // 검색용 데이터리스트
const playerCardsContainer = document.getElementById('player-cards-container');
const historyList = document.getElementById('historyList');
const historyNickname = document.getElementById('historyNickname');
const rankingChartCanvas = document.getElementById('rankingChart').getContext('2d');

let rankingChart;
const ADMIN_PASSWORD = "poker123!";
const AUTH_TOKEN_KEY = 'pokerAdminAuthToken';

// 인원수 드롭다운 채우기 (5-30)
for (let i = 5; i <= 30; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `${i}명`;
    participantsSelect.appendChild(option);
}
// 오늘 날짜 기본값 설정
document.getElementById('scoreDate').valueAsDate = new Date();


// --- 함수 ---

/**
 * 관리자 암호를 확인하는 비동기 함수.
 */
function checkAdminPassword() {
    return new Promise((resolve) => {
        if (localStorage.getItem(AUTH_TOKEN_KEY) === 'true') {
            resolve(true);
            return;
        }

        const passwordForm = document.getElementById('passwordForm');
        const passwordInput = document.getElementById('passwordInput');
        const rememberMeCheckbox = document.getElementById('rememberMeCheckbox');
        const modalCloseBtn = passwordModal.querySelector('.close-btn');
        
        passwordModal.style.display = 'block';
        passwordInput.focus();

        const handleSubmit = (e) => {
            e.preventDefault();
            if (passwordInput.value === ADMIN_PASSWORD) {
                if (rememberMeCheckbox.checked) {
                    localStorage.setItem(AUTH_TOKEN_KEY, 'true');
                }
                cleanupAndResolve(true);
            } else {
                alert("암호가 틀렸습니다.");
                passwordInput.value = "";
                passwordInput.focus();
            }
        };

        const handleCancel = () => cleanupAndResolve(false);
        const handleWindowClick = (event) => {
            if (event.target == passwordModal) cleanupAndResolve(false);
        };

        const cleanupAndResolve = (result) => {
            passwordModal.style.display = 'none';
            passwordInput.value = "";
            rememberMeCheckbox.checked = false;
            passwordForm.removeEventListener('submit', handleSubmit);
            modalCloseBtn.removeEventListener('click', handleCancel);
            window.removeEventListener('click', handleWindowClick);
            resolve(result);
        };

        passwordForm.addEventListener('submit', handleSubmit);
        modalCloseBtn.addEventListener('click', handleCancel);
        window.addEventListener('click', handleWindowClick);
    });
}


// --- 이벤트 리스너 ---

addPlayerBtn.addEventListener('click', async () => {
    const isAuthorized = await checkAdminPassword();
    if (!isAuthorized) return;
    const nickname = prompt("추가할 플레이어의 닉네임을 입력하세요:");
    if (nickname && nickname.trim() !== "") {
        addPlayer(nickname.trim());
    }
});

addScoreBtn.addEventListener('click', async () => {
    const isAuthorized = await checkAdminPassword();
    if (!isAuthorized) return;
    scoreModal.style.display = 'block';
});

// 검색창 입력 이벤트 리스너
searchPlayerInput.addEventListener('input', () => {
    filterPlayerCards();
});

closeBtns.forEach(btn => {
    if (btn.closest('#passwordModal')) return;
    btn.addEventListener('click', () => {
        scoreModal.style.display = 'none';
        historyModal.style.display = 'none';
    });
});

window.addEventListener('click', (event) => {
    if (event.target == scoreModal) scoreModal.style.display = 'none';
    if (event.target == historyModal) historyModal.style.display = 'none';
});

scoreForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('scoreDate').value;
    const gameType = document.getElementById('gameType').value;
    const nickname = document.getElementById('playerNickname').value.trim();
    const participants = parseInt(document.getElementById('participants').value);
    const rank = parseInt(document.getElementById('playerRank').value);

    if (!nickname) {
        alert("닉네임을 입력해주세요.");
        return;
    }
    
    const points = calculatePoints(participants, rank);
    if (points > 0) {
        await addPlayer(nickname);
        await addScore(nickname, date, gameType, participants, rank, points);
        alert(`${nickname}님에게 ${points}점이 적립되었습니다.`);
    } else {
        alert("해당 등수는 점수 적립 대상이 아닙니다.");
    }
    
    scoreForm.reset();
    document.getElementById('scoreDate').valueAsDate = new Date();
    scoreModal.style.display = 'none';
    await loadData();
});

// --- 데이터 처리 및 렌더링 함수 ---

function calculatePoints(participants, rank) {
    if (participants >= 5 && participants <= 6) {
        if (rank === 1) return 2; if (rank === 2) return 1;
    } else if (participants >= 7 && participants <= 10) {
        if (rank === 1) return 3; if (rank === 2) return 2; if (rank === 3) return 1;
    } else if (participants >= 11 && participants <= 15) {
        if (rank === 1) return 4; if (rank === 2) return 3; if (rank === 3) return 2; if (rank === 4) return 1;
    } else if (participants >= 16) {
        if (rank === 1) return 5; if (rank === 2) return 4; if (rank === 3) return 3; if (rank === 4) return 2; if (rank === 5) return 1;
    }
    return 0;
}

async function addPlayer(nickname) {
    const playerRef = doc(db, 'players', nickname);
    const docSnap = await getDoc(playerRef);
    if (!docSnap.exists()) {
        await setDoc(playerRef, { nickname: nickname, createdAt: new Date() });
        console.log("Player added:", nickname);
        await loadPlayersForDatalist();
    }
}

async function addScore(nickname, date, gameType, participants, rank, points) {
    await addDoc(collection(db, 'scores'), {
        nickname, date, gameType, participants, rank, points,
        createdAt: new Date()
    });
}

// 플레이어 목록을 두 개의 드롭다운에 모두 채우는 함수
async function loadPlayersForDatalist() {
    const q = query(collection(db, "players"), orderBy("nickname"));
    const snapshot = await getDocs(q);
    
    // 두 datalist를 초기화
    playerDatalist.innerHTML = '';
    playerDatalistSearch.innerHTML = '';

    snapshot.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.data().nickname;
        
        // 두 datalist에 동일한 옵션을 복제하여 추가
        playerDatalist.appendChild(option.cloneNode(true));
        playerDatalistSearch.appendChild(option.cloneNode(true));
    });
}

async function loadData() {
    const scoresSnapshot = await getDocs(collection(db, "scores"));
    const playersSnapshot = await getDocs(collection(db, "players"));
    const playerScores = {};
    playersSnapshot.forEach(doc => {
        playerScores[doc.data().nickname] = 0;
    });
    scoresSnapshot.forEach(doc => {
        const data = doc.data();
        if(playerScores.hasOwnProperty(data.nickname)) {
            playerScores[data.nickname] += data.points;
        }
    });
    const sortedByScore = Object.entries(playerScores).sort((a, b) => b[1] - a[1]);
    renderPlayerCards(sortedByScore);
    renderRankingChart(sortedByScore.slice(0, 10));
}

function renderPlayerCards(sortedPlayers) {
    playerCardsContainer.innerHTML = '';
    sortedPlayers.forEach(([nickname, score], index) => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.dataset.nickname = nickname; // 검색을 위해 데이터 속성에 닉네임 저장
        const rank = index + 1;
        if (rank <= 3) {
            card.classList.add(`rank-${rank}`);
        }
        const displayRank = String(rank).padStart(2, '0');
        card.innerHTML = `
            <h3>${displayRank}. ${nickname}</h3>
            <p class="score">${score}점</p>
        `;
        card.addEventListener('click', () => showHistory(nickname));
        playerCardsContainer.appendChild(card);
    });
}

// 검색어에 따라 플레이어 카드를 필터링하는 함수
function filterPlayerCards() {
    const searchTerm = searchPlayerInput.value.toLowerCase();
    const allCards = document.querySelectorAll('.player-card');

    allCards.forEach(card => {
        const nickname = card.dataset.nickname.toLowerCase();
        if (nickname.includes(searchTerm)) {
            card.style.display = 'block'; // 검색어와 일치하면 보이게
        } else {
            card.style.display = 'none'; // 일치하지 않으면 숨김
        }
    });
}

function renderRankingChart(topPlayers) {
    const labels = topPlayers.map(p => p[0]);
    const data = topPlayers.map(p => p[1]);
    if (rankingChart) {
        rankingChart.destroy();
    }
    const pastelColors = [
        'rgba(255, 182, 193, 0.7)', 'rgba(255, 228, 181, 0.7)', 'rgba(173, 216, 230, 0.7)',
        'rgba(144, 238, 144, 0.7)', 'rgba(221, 160, 221, 0.7)', 'rgba(240, 230, 140, 0.7)',
        'rgba(175, 238, 238, 0.7)', 'rgba(255, 218, 185, 0.7)', 'rgba(152, 251, 152, 0.7)',
        'rgba(216, 191, 216, 0.7)',
    ];
    const borderColors = pastelColors.map(color => color.replace('0.7', '1'));
    rankingChart = new Chart(rankingChartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '총 상점', data: data,
                backgroundColor: pastelColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#333333' } },
                y: { beginAtZero: true, ticks: { color: '#333333' } }
            }
        }
    });
}

async function showHistory(nickname) {
    historyNickname.textContent = `${nickname}님의 획득 내역`;
    historyList.innerHTML = '<li>로딩 중...</li>';
    historyModal.style.display = 'block';
    const q = query(
        collection(db, "scores"), 
        where("nickname", "==", nickname), 
        orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    historyList.innerHTML = '';
    if (snapshot.empty) {
        historyList.innerHTML = '<li>획득 내역이 없습니다.</li>';
        return;
    }
    snapshot.forEach(doc => {
        const data = doc.data();
        const li = document.createElement('li');
        li.textContent = `[${data.date}] ${data.gameType} (${data.participants}명 중 ${data.rank}등) - ${data.points}점 획득`;
        historyList.appendChild(li);
    });
}

// --- 초기화 ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadPlayersForDatalist();
    await loadData();
});