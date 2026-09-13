'use client'

import { useState } from 'react';
import Image from "next/image";
import CardMenuBtnPlay from "@/src/components/CardMenuBtn/CardMenuBtn";
import CardMenuBtnTactics from "@/src/components/CardMenuBtn/CardMenuBtnTactics";
import CardMenuBtnTrening from "@/src/components/CardMenuBtn/CardMenuBtnTrening";
import Friends from "@/src/components/online-friends/friends";
import Tactics from "./tactics/page";
import Trening from './trening/page';
import MenuBtn from "@/src/components/menu-btn";
import Modal from "@/src/components/modal"; // Импорт компонента модального окна

export default function Home() {
  const [activeTab, setActiveTab] = useState('menu');
  
  // Состояния для модальных окон
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <div className="menu-container">
        <aside className="menu-left">
          <div className="menu-wrapper">
            <div className="menu-top">
              <div className="menu-after">
                <p className="project-name">Blind chess master</p>
                <div className="account">
                  <p className="account-title">Аккаунт</p>
                  <div className="logo">
                    <Image src="/user-icon.png" width={100} height={100} alt="User Icon" />
                    <div className="info-group">
                      <p>User123</p>
                      <p>1600 elo</p>
                    </div>
                  </div>
                </div>
              </div>
              <hr />
              <div className="menu-before">
                <MenuBtn></MenuBtn>
              </div>
            </div>
            <div className="menu-bottom">
              {/* Кнопки вызова модальных окон */}
              <button 
                className="menu-href modal-btn" 
                onClick={() => setIsSettingsOpen(true)}
              >
                Настройки
              </button>
              <button 
                className="menu-href modal-btn" 
                onClick={() => setIsHelpOpen(true)}
              >
                Помощь
              </button>
            </div>
          </div> 
        </aside>

        <main className="menu-right">
          {activeTab === 'menu' && (
            <>
              <div className="card-block">
                <div onClick={() => setActiveTab('game')}>
                  <CardMenuBtnPlay />
                </div>
                <div onClick={() => setActiveTab('tactics')}>
                  <CardMenuBtnTactics />
                </div>
                <div onClick={() => setActiveTab('training')}>
                  <CardMenuBtnTrening />
                </div>
              </div>
              <Friends />
            </>
          )}

          {activeTab === 'tactics' && <Tactics />}
          {activeTab === 'training' && <Trening />}
        </main>
      </div>

      {/* Модальное окно Настроек */}
      <Modal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        title="Настройки игры"
      >
        <div className="setting-item">
          <label htmlFor="sound">Звуковые эффекты:</label>
          <input type="checkbox" id="sound" defaultChecked />
        </div>
        <div className="setting-item">
          <label htmlFor="blind-mode">Режим полной слепоты:</label>
          <input type="checkbox" id="blind-mode" />
        </div>
        <div className="setting-item">
          <label htmlFor="theme">Тема доски:</label>
          <select id="theme">
            <option value="classic">Классическая</option>
            <option value="dark">Темная</option>
          </select>
        </div>
      </Modal>

      {/* Модальное окно Помощи */}
      <Modal 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)} 
        title="Помощь и правила"
      >
        <p><strong>Blind Chess Master</strong> — это сервис для игры в шахматы "вслепую".</p>
        <p><strong>Основные возможности:</strong></p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>Вводить ходы с помощью текстовой нотации (например, e2e4).</li>
          <li>Тренировать визуализацию доски в режиме «Тактика».</li>
          <li>Соревноваться с друзьями в реальном времени.</li>
        </ul>
        <p>При возникновении проблем пишите в поддержку: <code>support@blindchess.com</code></p>
      </Modal>
    </>
  );
}