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
const setupPlayersBtn = document.getElementById('setupPlayersBtn'); // 설정 버튼
const scoreModal = document.getElementById('scoreModal');
const historyModal = document.getElementById('historyModal');
const closeBtns = document.querySelectorAll('.close-btn');
const scoreForm = document.getElementById('scoreForm');
const participantsSelect = document.getElementById('participants');
const playerDatalist = document.getElementById('player-list');
const playerCardsContainer = document.getElementById('player-cards-container');
const historyList = document.getElementById('historyList');
const historyNickname = document.getElementById('historyNickname');
const rankingChartCanvas = document.getElementById('rankingChart').getContext('2d');

let rankingChart;

// 기본 플레이어 닉네임 목록
const initialPlayerNicknames = [
    "강아지똥", "개아범", "고구마", "곰인", "귤", "나미", "나인", "노하", "돌멩이", 
    "돌체", "디네로", "뚜", "룰루", "림프", "망고", "문문", "상일", "세준", "송하", 
    "스냅", "승민", "안아줘요", "야도란", "영재", "영준", "예수", "오팔", "옥수수", 
    "용준", "우주", "유미", "윤혁", "의성", "이방인", "인사이더", "자쓰민", "장현", 
    "재혁", "재형", "지구", "지호", "진상", "찐빵", "철", "체크", "침착맨", "카피바라", 
    "쿠쿠", "태산", "태은", "티라미슈", "팔팔", "팝스타", "팬더", "포카드", "하람", 
    "현", "호준", "홍", "환경", "화학", "황", "훈", "BOK", "DD", "DY", "HM", "KJ", "Lin"
];

// 인원수 드롭다운 채우기 (5-30)
for (let i = 5; i <= 30; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `${i}명`;
    participantsSelect.appendChild(option);
}
// 오늘 날짜 기본값 설정
document.getElementById('scoreDate').valueAsDate = new Date();


// --- 이벤트 리스너 ---

// '플레이어 추가' 버튼 클릭
addPlayerBtn.addEventListener('click', () => {
    const nickname = prompt("추가할 플레이어의 닉네임을 입력하세요:");
    if (nickname && nickname.trim() !== "") {
        addPlayer(nickname.trim());
    }
});

// '상점 입력' 버튼 클릭
addScoreBtn.addEventListener('click', () => {
    scoreModal.style.display = 'block';
});

// '초기 플레이어 설정' 버튼 클릭
setupPlayersBtn.addEventListener('click', async () => {
    if (confirm("초기 플레이어 목록을 Firebase에 저장하시겠습니까? 이미 있는 플레이어는 중복 추가되지 않습니다.")) {
        await addInitialPlayers();
    }
});

// 모달 닫기 버튼
closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        scoreModal.style.display = 'none';
        historyModal.style.display = 'none';
    });
});

// 모달 바깥 영역 클릭 시 닫기
window.addEventListener('click', (event) => {
    if (event.target == scoreModal) {
        scoreModal.style.display = 'none';
    }
    if (event.target == historyModal) {
        historyModal.style.display = 'none';
    }
});

// 상점 입력 폼 제출
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


// --- 함수 ---

// 초기 플레이어 목록을 Firestore에 저장 (최초 1회용)
async function addInitialPlayers() {
    let addedCount = 0;
    for (const nickname of initialPlayerNicknames) {
        const playerRef = doc(db, 'players', nickname);
        const docSnap = await getDoc(playerRef);
        if (!docSnap.exists()) {
            await setDoc(playerRef, { nickname: nickname, createdAt: new Date() });
            addedCount++;
        }
    }
    alert(`초기 플레이어 설정 완료! 총 ${addedCount}명의 신규 플레이어가 추가되었습니다.`);
    await loadPlayersForDatalist();
    await loadData();
}

// 점수 계산 로직
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

// Firestore에 플레이어 추가 (중복 방지)
async function addPlayer(nickname) {
    const playerRef = doc(db, 'players', nickname);
    const docSnap = await getDoc(playerRef);
    if (!docSnap.exists()) {
        await setDoc(playerRef, { nickname: nickname, createdAt: new Date() });
        console.log("Player added:", nickname);
        await loadPlayersForDatalist(); // 새 플레이어 추가 후 목록 갱신
    }
}

// Firestore에 점수 기록 추가
async function addScore(nickname, date, gameType, participants, rank, points) {
    await addDoc(collection(db, 'scores'), {
        nickname, date, gameType, participants, rank, points,
        createdAt: new Date()
    });
}

// 플레이어 목록 불러와서 드롭다운 채우기
async function loadPlayersForDatalist() {
    const q = query(collection(db, "players"), orderBy("nickname"));
    const snapshot = await getDocs(q);
    playerDatalist.innerHTML = '';
    snapshot.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.data().nickname;
        playerDatalist.appendChild(option);
    });
}

// 전체 데이터 로드 및 UI 렌더링
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

    // 점수 기준 정렬 (랭킹 및 차트용)
    const sortedByScore = Object.entries(playerScores).sort((a, b) => b[1] - a[1]);

    // 이름 기준 정렬 (카드 표시용)
    const sortedByName = Object.entries(playerScores).sort((a, b) => a[0].localeCompare(b[0]));
    
    // 닉네임별 랭킹 정보를 Map으로 생성
    const rankMap = new Map();
    sortedByScore.forEach(([nickname], index) => {
        rankMap.set(nickname, index + 1);
    });

    renderPlayerCards(sortedByName, rankMap);
    renderRankingChart(sortedByScore.slice(0, 10));
}

// 플레이어 카드 UI 렌더링 (이름순 정렬)
function renderPlayerCards(sortedPlayers, rankMap) {
    playerCardsContainer.innerHTML = '';
    sortedPlayers.forEach(([nickname, score]) => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.dataset.nickname = nickname;

        const rank = rankMap.get(nickname); // Map에서 실제 랭킹 조회
        if (rank <= 3) {
            card.classList.add(`rank-${rank}`);
        }

        card.innerHTML = `
            <h3>${rank}. ${nickname}</h3>
            <p class="score">${score}점</p>
        `;
        card.addEventListener('click', () => showHistory(nickname));
        playerCardsContainer.appendChild(card);
    });
}

// 랭킹 그래프 렌더링 (점수 상위 10명)
function renderRankingChart(topPlayers) {
    const labels = topPlayers.map(p => p[0]);
    const data = topPlayers.map(p => p[1]);

    if (rankingChart) {
        rankingChart.destroy();
    }

    rankingChart = new Chart(rankingChartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '총 상점', data: data,
                backgroundColor: 'rgba(233, 69, 96, 0.6)',
                borderColor: 'rgba(233, 69, 96, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, ticks: { color: '#e0e0e0' } },
                y: { ticks: { color: '#e0e0e0' } }
            }
        }
    });
}

// 특정 플레이어의 히스토리 보기
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
// 앱 시작 시 데이터 로드
document.addEventListener('DOMContentLoaded', async () => {
    await loadPlayersForDatalist();
    await loadData();
});