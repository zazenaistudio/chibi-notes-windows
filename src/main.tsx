import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './showcase.css';

const startupView = new URLSearchParams(window.location.search).get('view');
if (startupView === 'showcase') {
  document.documentElement.classList.add('showcase-html');
  document.body.classList.add('showcase-body');
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
