import { useNavigate, useLocation } from "react-router-dom";

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="mobile-bottom-nav">

            <button
                className={`bottom-nav-btn ${
                    location.pathname === "/" ? "active-nav" : ""
                }`}
                onClick={() => navigate("/")}
            >
                🏠
                <span>홈</span>
            </button>

            <button
                className={`bottom-nav-btn ${
                    location.pathname === "/calendar" ? "active-nav" : ""
                }`}
                onClick={() => navigate("/calendar")}
            >
                📅
                <span>캘린더</span>
            </button>

            <button
                className={`bottom-nav-btn ${
                    location.pathname === "/map" ? "active-nav" : ""
                }`}
                onClick={() => navigate("/map")}
            >
                🗺️
                <span>지도</span>
            </button>

            <button
                className={`bottom-nav-btn ${
                    location.pathname === "/community" ? "active-nav" : ""
                }`}
                onClick={() => navigate("/community")}
            >
                💬
                <span>커뮤니티</span>
            </button>

            <button
                className={`bottom-nav-btn ${
                    location.pathname === "/mypage" ? "active-nav" : ""
                }`}
                onClick={() => navigate("/mypage")}
            >
                👤
                <span>내현장</span>
            </button>

        </div>
    );
}