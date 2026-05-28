import "./Footer.scss";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner container">
        <p className="footer-text">
          &copy; {new Date().getFullYear()} HalleMalle. All rights reserved.
        </p>
        <p className="footer-links">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}
