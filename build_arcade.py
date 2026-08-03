import re

with open('public/arcade/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

cards = re.findall(r'<a href=[^>]*>.*?</a>', html, re.DOTALL)

def find_card(name):
    for c in cards:
        if f'data-game="{name}"' in c:
            return c
    return ''

board_games = [find_card(g) for g in ['chess', 'reversi', 'checkers', 'go', 'mancala', 'xiangqi']]
card_games = [find_card(g) for g in ['blackjack', 'poker', 'entropy']]
action_games = [find_card(g) for g in ['fagocito', 'snake', 'peaton']]

new_main = '<main class="arcade-grid">\n'
new_main += '        <h2 class="category-title">♟️ Tableros (Minimax & MCTS)</h2>\n'
new_main += '\n'.join(filter(None, board_games)) + '\n'

new_main += '        <h2 class="category-title">🃏 Cartas & Azar (Estocástica)</h2>\n'
new_main += '\n'.join(filter(None, card_games)) + '\n'
new_main += '''        <a href="#" class="arcade-card" data-game="guerra">
            <div class="card-header">
                <div class="game-icon">⚔️</div>
                <div class="status-badge" data-state="waiting"><div class="dot"></div> solo lógica</div>
            </div>
            <div class="card-body">
                <h2>Guerra (War)</h2>
                <p>Mecánica estocástica. (Visor HTML pendiente).</p>
            </div>
            <div class="card-footer">
                <div class="api-endpoint">/arcade/guerra/move</div>
                <div class="players"></div>
            </div>
        </a>
'''

new_main += '        <h2 class="category-title">🕹️ Arcade (Reflejos y Grid)</h2>\n'
new_main += '\n'.join(filter(None, action_games)) + '\n'

new_main += '        <h2 class="category-title">🌌 Simuladores Complejos (Monolitos 3D)</h2>\n'
new_main += '''        <a href="../games/raccoon_space.html" class="arcade-card" data-game="raccoon">
            <div class="card-header">
                <div class="game-icon">🦝</div>
                <div class="status-badge" data-state="active"><div class="dot"></div> 3D sim</div>
            </div>
            <div class="card-body">
                <h2>Raccoon Space</h2>
                <p>Sistema de escape, físicas y pathfinding 3D.</p>
            </div>
            <div class="card-footer">
                <div class="api-endpoint">/gym/raccoon/state</div>
                <div class="players"></div>
            </div>
        </a>
        <a href="../labs/croupier_cucco_swarm.html" class="arcade-card" data-game="swarm">
            <div class="card-header">
                <div class="game-icon">🐔</div>
                <div class="status-badge" data-state="active"><div class="dot"></div> 3D sim</div>
            </div>
            <div class="card-body">
                <h2>Cucco Swarm</h2>
                <p>Algoritmos de Flocking y Boids (Enjambre).</p>
            </div>
            <div class="card-footer">
                <div class="api-endpoint">/gym/swarm/state</div>
                <div class="players"></div>
            </div>
        </a>
        <a href="../games/croupier_corporate_building.html" class="arcade-card" data-game="corporate">
            <div class="card-header">
                <div class="game-icon">🏢</div>
                <div class="status-badge" data-state="active"><div class="dot"></div> 3D sim</div>
            </div>
            <div class="card-body">
                <h2>Corporate Horror</h2>
                <p>Generación procedural de laberintos y survival.</p>
            </div>
            <div class="card-footer">
                <div class="api-endpoint">/gym/corporate/state</div>
                <div class="players"></div>
            </div>
        </a>
'''
new_main += '    </main>'

new_html = re.sub(r'<main class="arcade-grid">.*?</main>', new_main, html, flags=re.DOTALL)

with open('public/arcade/index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)
