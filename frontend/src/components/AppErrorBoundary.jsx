import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[AppErrorBoundary]", error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <h1 style={{ fontSize: 18, margin: "0 0 8px" }}>화면을 불러오지 못했습니다</h1>
          <p style={{ margin: 0, color: "#57534e" }}>잠시 후 새로고침해 주세요.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
