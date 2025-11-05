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
const saveImageBtn = document.getElementById('saveImageBtn'); 
const useScoreBtn = document.getElementById('useScoreBtn'); // ✅ [수정] '승점 사용' 버튼
const searchPlayerInput = document.getElementById('searchPlayerInput'); 
const scoreModal = document.getElementById('scoreModal');
const useScoreModal = document.getElementById('useScoreModal'); // ✅ [수정] '승점 사용' 모달
const historyModal = document.getElementById('historyModal');
const passwordModal = document.getElementById('passwordModal');
const closeBtns = document.querySelectorAll('.close-btn');
const scoreForm = document.getElementById('scoreForm');
const useScoreForm = document.getElementById('useScoreForm'); // ✅ [수정] '승점 사용' 폼
const participantsSelect = document.getElementById('participants');
const playerDatalist = document.getElementById('player-list');
const playerDatalistSearch = document.getElementById('player-list-search'); 
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

// ✅ [수정] '승점 사용' 버튼 이벤트 리스너
useScoreBtn.addEventListener('click', async () => {
    const isAuthorized = await checkAdminPassword();
    if (!isAuthorized) return;
    // 새 모달의 날짜 기본값 설정
    document.getElementById('usageDate').valueAsDate = new Date();
    useScoreModal.style.display = 'block';
});

// '이미지 저장' (html2canvas 미사용, 제목 직접 그리기 방식)
saveImageBtn.addEventListener('click', async () => {
    saveImageBtn.disabled = true;
    saveImageBtn.textContent = '캡처 중...';

    // 1. Chart.js 내장 기능으로 '차트'만 캡처 (흰색 배경 포함)
    const ctx = rankingChart.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#FFFFFF'; // 흰색
    ctx.fillRect(0, 0, rankingChart.width, rankingChart.height);
    const chartImageDataUrl = rankingChart.toBase64Image('image/png');
    ctx.restore();

    // 2. 캡처한 차트 데이터를 임시 이미지로 로드 (크기 확인용)
    const chartImage = new Image();
    chartImage.onload = () => {
        // 3. 이미지가 로드되면, '제목 + 차트'를 그릴 새 캔버스 생성
        const finalCanvas = document.createElement('canvas');
        const titleText = '🏆 TOP RANKING 🏆';
        const titleFontSize = 24; // H2 태그의 일반적인 크기
        const titleFontFamily = "'Noto Sans KR', sans-serif";
        const titleColor = '#333333';
        const titlePadding = 30; // 제목 상하 여백

        // 4. 새 캔버스 크기 설정
        finalCanvas.width = chartImage.width;
        finalCanvas.height = chartImage.height + titleFontSize + titlePadding;
        
        const fCtx = finalCanvas.getContext('2d');

        // 5. 새 캔버스 배경을 흰색으로 채우기
        fCtx.fillStyle = '#FFFFFF';
        fCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

        // 6. 새 캔버스에 '제목' 그리기
        fCtx.fillStyle = titleColor;
        fCtx.font = `bold ${titleFontSize}px ${titleFontFamily}`;
        fCtx.textAlign = 'center';
        fCtx.textBaseline = 'middle';
        fCtx.fillText(titleText, finalCanvas.width / 2, (titleFontSize / 2) + (titlePadding / 2));

        // 7. 새 캔버스에 '차트 이미지' 그리기
        fCtx.drawImage(chartImage, 0, titleFontSize + titlePadding);

        // 8. 완성된 캔버스를 이미지로 다운로드
        const image = finalCanvas.toDataURL("image/png");
        const link = document.createElement('a');
        
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const filename = `홀덤랭킹_그래프_${year}${month}${day}_${hours}${minutes}${seconds}.png`;

        link.download = filename;
        link.href = image;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 9. 완료 후 버튼 복구
        saveImageBtn.disabled = false;
        saveImageBtn.textContent = '📸 이미지 저장 📸';
    };
    
    // 10. 이미지 로드 시작
    chartImage.src = chartImageDataUrl;
});


// 검색창 입력 이벤트 리스너
searchPlayerInput.addEventListener('input', () => {
    filterPlayerCards();
});

// ✅ [수정] 닫기 버튼 로직에 useScoreModal 추가
closeBtns.forEach(btn => {
    if (btn.closest('#passwordModal')) return;
    btn.addEventListener('click', () => {
        scoreModal.style.display = 'none';
        historyModal.style.display = 'none';
        useScoreModal.style.display = 'none'; // 새 모달 닫기
    });
});

// ✅ [수정] 모달 바깥 클릭 로직에 useScoreModal 추가
window.addEventListener('click', (event) => {
    if (event.target == scoreModal) scoreModal.style.display = 'none';
    if (event.target == historyModal) historyModal.style.display = 'none';
    if (event.target == useScoreModal) useScoreModal.style.display = 'none'; // 새 모달 닫기
});

// '상점 입력' 폼 제출
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
        await addPlayer(nickname); // 플레이어가 없으면 자동 추가
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

// ✅ [수정] '승점 사용' 폼 제출 이벤트 리스너
useScoreForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('usageDate').value;
    const gameType = document.getElementById('usageGameType').value.trim(); // 대회명
    const nickname = document.getElementById('usagePlayerNickname').value.trim();
    const pointsUsed = parseInt(document.getElementById('pointsUsed').value);

    if (!nickname) {
        alert("닉네임을 입력해주세요.");
        return;
    }
    
    if (!gameType) {
        alert("대회명(사용 내역)을 입력해주세요.");
        return;
    }

    if (pointsUsed > 0) {
        const points = -pointsUsed; // 점수를 음수로 변환
        
        // '승점 사용' 내역도 'addScore' 함수를 통해 'scores' 컬렉션에 저장
        // (participants=0, rank="사용"으로 구분)
        await addScore(nickname, date, gameType, 0, "사용", points); 
        alert(`${nickname}님이 ${pointsUsed}점을 사용했습니다. (총 점수 차감)`);
        
        useScoreForm.reset();
        useScoreModal.style.display = 'none';
        await loadData(); // 데이터 새로고침
    } else {
        alert("사용할 점수를 1점 이상 입력해주세요.");
    }
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

// 이 함수는 'scores' 컬렉션에 문서를 추가하는 역할
// points가 양수(+)면 적립, 음수(-)면 차감(사용)으로 기록됨
async function addScore(nickname, date, gameType, participants, rank, points) {
    const timestamp = new Date().getTime();
    const customId = `${date}-${nickname}-${rank}-${timestamp}`;
    const scoreRef = doc(db, 'scores', customId);
    
    await setDoc(scoreRef, {
        nickname, date, gameType, participants, rank, points,
        createdAt: new Date(timestamp)
    });
}

async function loadPlayersForDatalist() {
    const q = query(collection(db, "players"), orderBy("nickname"));
    const snapshot = await getDocs(q);
    
    playerDatalist.innerHTML = '';
    playerDatalistSearch.innerHTML = '';

    snapshot.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.data().nickname;
        
        playerDatalist.appendChild(option.cloneNode(true));
        playerDatalistSearch.appendChild(option.cloneNode(true));
    });
}

// 이 함수는 'scores' 컬렉션의 모든 'points' 필드를 합산
// (음수 점수(승점 사용)가 있으면 자동으로 차감됨)
async function getCurrentPlayerScores() {
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
    return playerScores;
}

async function loadData() {
    const playerScores = await getCurrentPlayerScores();
    
    const sortedByScore = Object.entries(playerScores).sort((a, b) => b[1] - a[1]);

    renderPlayerCards(sortedByScore);
    
    const playersForChart = sortedByScore.filter(player => player[1] > 0);
    
    renderRankingChart(playersForChart);
}

function renderPlayerCards(sortedPlayers) {
    playerCardsContainer.innerHTML = '';
    sortedPlayers.forEach(([nickname, score], index) => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.dataset.nickname = nickname; 
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
        if (searchTerm === '' || nickname.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
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
    
    const backgroundColors = labels.map((_, i) => pastelColors[i % pastelColors.length]);
    const borderColors = backgroundColors.map(color => color.replace('0.7', '1'));

    rankingChart = new Chart(rankingChartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '총 상점', data: data,
                backgroundColor: backgroundColors,
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

// ✅ [수정] 획득 내역 함수가 '승점 사용' 내역도 보여주도록 수정
async function showHistory(nickname) {
    historyNickname.textContent = `${nickname}님의 획득/사용 내역`;
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
        historyList.innerHTML = '<li>내역이 없습니다.</li>';
        return;
    }
    snapshot.forEach(doc => {
        const data = doc.data();
        const li = document.createElement('li');
        
        if (data.points > 0) {
            // 기존 획득 내역
            li.textContent = `[${data.date}] ${data.gameType} (${data.participants}명 중 ${data.rank}등) - ${data.points}점 획득`;
            li.style.color = 'blue'; // 획득은 파란색
        } else {
            // '승점 사용' 내역 (points가 음수)
            li.textContent = `[${data.date}] ${data.gameType} - ${Math.abs(data.points)}점 사용`;
            li.style.color = 'red'; // 사용은 빨간색
        }
        historyList.appendChild(li);
    });
}

// --- 초기화 ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadPlayersForDatalist();
    await loadData();
});