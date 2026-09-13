'use client'

import { useState } from 'react';
import Image from "next/image";
import CardMenuBtnPlay from "@/src/components/CardMenuBtn/CardMenuBtn";
import CardMenuBtnTactics from "@/src/components/CardMenuBtn/CardMenuBtnTactics";
import CardMenuBtnTrening from "@/src/components/CardMenuBtn/CardMenuBtnTrening";
import Friends from "@/src/components/online-friends/friends";
import MenuBtn from "@/src/components/menu-btn";
import Game from "../game/page";
import Trening from '../trening/page';
import Modal from "@/src/components/modal"; // Импорт компонента модального окна

export default function Tactics(){
    const [activeTab, setActiveTab] = useState('menu');
    
    // Состояния для модальных окон
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    return(
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
                <div className="game-right">
                    <div className="left_panel">
                        <p className="title">Задача 1</p>
                        <p className='made_moves'>Ход ___, ___ в _ хода</p>
                        <div className="moves_panel_chess">Random position</div>
                        <textarea className="move_input" placeholder="Введите свой следующий ход например (лf3, e.g)" ></textarea>
                    </div>
                    <div className="game-container">
                        <div className="game-board">
                            <div className="line">
                                <div className="black" id="a8"></div>
                                <div className="white" id="b8"></div>
                                <div className="black" id="c8"></div>
                                <div className="white" id="d8"></div>
                                <div className="black" id="e8"></div>
                                <div className="white" id="f8"></div>
                                <div className="black" id="g8"></div>
                                <div className="white" id="h8"></div>
                            </div>
                            <div className="line">
                                <div className="white" id="a7"></div>
                                <div className="black" id="b7"></div>
                                <div className="white" id="c7"></div>
                                <div className="black" id="d7"></div>
                                <div className="white" id="e7"></div>
                                <div className="black" id="f7"></div>
                                <div className="white" id="g7"></div>
                                <div className="black" id="h7"></div>
                            </div>
                            <div className="line">
                                <div className="black" id="a6"></div>
                                <div className="white" id="b6"></div>
                                <div className="black" id="c6"></div>
                                <div className="white" id="d6"></div>
                                <div className="black" id="e6"></div>
                                <div className="white" id="f6"></div>
                                <div className="black" id="g6"></div>
                                <div className="white" id="h6"></div>
                            </div>
                            <div className="line">
                                <div className="white" id="a5"></div>
                                <div className="black" id="b5"></div>
                                <div className="white" id="c5"></div>
                                <div className="black" id="d5"></div>
                                <div className="white" id="e5"></div>
                                <div className="black" id="f5"></div>
                                <div className="white" id="g5"></div>
                                <div className="black" id="h5"></div>
                            </div>
                            <div className="line">
                                <div className="black" id="a4"></div>
                                <div className="white" id="b4"></div>
                                <div className="black" id="c4"></div>
                                <div className="white" id="d4"></div>
                                <div className="black" id="e4"></div>
                                <div className="white" id="f4"></div>
                                <div className="black" id="g4"></div>
                                <div className="white" id="h4"></div>
                            </div>
                            <div className="line">
                                <div className="white" id="a3"></div>
                                <div className="black" id="b3"></div>
                                <div className="white" id="c3"></div>
                                <div className="black" id="d3"></div>
                                <div className="white" id="e3"></div>
                                <div className="black" id="f3"></div>
                                <div className="white" id="g3"></div>
                                <div className="black" id="h3"></div>
                            </div>
                            <div className="line">
                                <div className="black" id="a2"></div>
                                <div className="white" id="b2"></div>
                                <div className="black" id="c2"></div>
                                <div className="white" id="d2"></div>
                                <div className="black" id="e2"></div>
                                <div className="white" id="f2"></div>
                                <div className="black" id="g2"></div>
                                <div className="white" id="h2"></div>
                            </div>
                            <div className="line">
                                <div className="white" id="a1"></div>
                                <div className="black" id="b1"></div>
                                <div className="white" id="c1"></div>
                                <div className="black" id="d1"></div>
                                <div className="white" id="e1"></div>
                                <div className="black" id="f1"></div>
                                <div className="white" id="g1"></div>
                                <div className="black" id="h1"></div>
                            </div>
                        </div>
                        <div className="game-info">
                            <div className="reiting list-item">
                                <div className="level_hard">
                                    <p className="level">Уровень сложности:</p>
                                    <select name="level_hard" id="">
                                        <option value="easy">Легкий</option>
                                        <option value="medium">Средний</option>
                                        <option value="hard">Сложный</option>
                                    </select>
                                </div>
                                <p className="raiting">Рейтинг: ____</p>
                            </div>
                            <div className="list-item">
                                <button id="skip" className="btn">Пропустить задачу</button>
                                <button id="skip" className="btn">Пропустить задачу</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
    )
}