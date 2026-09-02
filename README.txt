Zanzarah World Editor v0.9.0

Стабильная сборка на базе всех наработок v0.8.35 EXP.

Главное в v0.9.0:
- Подтверждённые групповые нападения: лидер + 1/2 помощника входят в один бой.
- Убраны три телепортации камеры перед групповым боем: не генерируются фиксированные фазы &.3001 / &.3002 / &.3003.
- После победы лидер и помощники корректно исчезают через post-battle cleanup a.<trigger>.
- Имена групповых профилей: _CustomGroup01_Leader, _CustomGroup01_Support01 и т.д.
- При выборе корневой папки игры Resources/data_0.pak находится автоматически; ручной выбор data_0.pak оставлен.
- Можно либо скачать изменённые _fb0x05.fbs и SCN отдельно, либо перезаписать оба файла прямо в папках игры с резервными .zwe.bak.
- Все прежние возможности редактора, включая 3D BSP drag, wild pools, команды NPC и предметы, сохранены.

ZANZARAH WORLD EDITOR v0.8.26

Что умеет эта сборка:
- Загружает _fb0x05.fbs и SCN из папки игры.
- Показывает NPC, предметы и точки диких фей на BSP-карте.
- Позволяет менять команду фей у уже существующего врага: выберите врага на карте, измените до 5 фей/уровней, нажмите «Применить команду к FBS» и скачайте _fb0x05.fbs.
- Позволяет создать отдельного нового видимого эльфа-врага. Новый профиль клонируется из выбранного эльфийского шаблона _fb0x05, получает собственный UID и свою команду фей. Затем его можно поставить на карту кнопкой «+ NPC кликом».
- Новый видимый эльф создаётся как hostile trigger type=1, ii=3, ii1=<UID профиля>, ii2=0, ii3=0, ii4=0, radius=5.
- На 3D-карте NPC теперь отображаются не точкой, а 3D-проецируемой фигурой с направлением взгляда. Это пока не настоящий игровой DFF-скелет/меш, а наглядный 3D-маркер.
- Дикие феи: можно выбрать штатный/готовый диапазон либо вручную ввести Min/Max.
- Ручной Min/Max работает и для одной дикой феи, и для целого выбранного пула. Для точного диапазона создаётся отдельный _fb0x05-профиль на механике ii=8, которую уже подтвердили в игре.
- Вкладка «Пулы» также позволяет сохранить ручной Min/Max для кастомного пула; при размещении такого пула редактор использует _fb0x05-профиль с точным диапазоном.

Проверенный пользователем результат предыдущей версии:
- ii=8 + новый _fb0x05 wild-профиль работает в игре;
- диапазон 10–15 дал фею 12 уровня;
- бой прошёл нормально;
- видимый эльф при ii=8 не создаётся, поэтому эта механика используется только для диких фей.

Что тестировать в v0.8.13:
1. Откройте папку оригинальной игры с _fb0x05.fbs и SCN.
2. Откройте сцену с уже существующим врагом, кликните по его 3D-маркеру, измените команду фей, сохраните _fb0x05.fbs и проверьте этого врага в игре.
3. Для нового врага выберите эльфийский шаблон, задайте команду фей, нажмите «Создать отдельного эльфа с текущей командой», затем «+ NPC кликом» и поставьте его на землю.
4. Скачайте оба файла: _fb0x05.fbs и изменённую SCN.
5. Проверьте, появился ли видимый эльф, нападает ли он, какой набор фей у него в бою и нормально ли завершается бой.

ВАЖНО:
- Всегда сохраняйте резервные копии игровых файлов.
- Изменение команды существующего профиля затрагивает все места на картах, где используется этот же UID.
- Новый отдельный эльф создаётся как новая запись _fb0x05; именно этот путь сейчас требует игрового теста.
- Точный игровой меш персонажа редактор пока не рендерит: для этого нужен отдельный разбор DFF/actor-моделей. Сейчас используется объёмный 3D-маркер вместо точки.

См. также:
- SCN_FB0X05_RESEARCH.txt — найденная связь SCN ↔ _fb0x05 и примеры из двух модов.
- CHANGELOG_v0.1-v0.8.26.txt — единая история версий.


v0.8.15: новый враг создаётся одной кнопкой и кликом по карте. Используются только battle-ready шаблоны с полноценными start/dialogue/combat/post-battle scripts; по умолчанию nq4001.


v0.8.15:
- Подтверждено игровым тестом: CustomElf, созданный по battle-ready шаблону nq4001, сам нападает и бой проходит нормально.
- Добавлено удаление отдельного custom-профиля _fb0x05.
- Добавлена массовая очистка старых нерабочих CustomElf/CustomShadowElf без полноценного battle-script.
- Внешность нового врага теперь явно выбирается через actor-шаблон; показывается actor UID и можно найти на текущей карте NPC с тем же actor как визуальный пример.
- Настоящий DFF-меш персонажа в 3D-превью пока не рендерится: выбор внешности уже влияет на внешний вид в самой игре, но для точного превью нужен разбор actor->DFF.


v0.8.16: НОВЫЕ ВРАГИ
---------------------
- Старые _CustomShadowElf_XX теперь можно удалять кнопкой очистки или по одному.
- Внешность нового врага выбирается по рабочему NPC-шаблону и его команде C.<model>.
- Если в папке есть data_0.pak, редактор пытается показать настоящую DFF-геометрию выбранной внешности прямо в панели создания врага.
- Если загружен _fb0x06.fbs, можно выбрать существующую стандартную реплику нападения по тексту.
- Создание собственных реплик отключено: gameplay-тест показал вылет игры при нападении с новой диалоговой записью.
- 3D-предпросмотр DFF теперь читает UV/materials и пытается автоматически подгрузить текстуры персонажа из data_0.pak по именам материалов.

ZMS-1 (pickup ×N)
------------------
Механика N реальных collectable объектов остаётся безопасной и даёт правильное количество в inventory. Форматирование игрового popup для обычных предметов исследуется отдельно; v0.8.16 не выдаёт непроверенный EXE-патч за исправление.




=== v0.8.24 — independent groups + 3D point dragging ===
- Group profiles are no longer copied from scene-specific ns3224/ns3225.
- Leader/support roles are applied to independent nq4001-based CustomElf clones.
- 2–5 opponents, each with its own appearance and W deck.
- Support positions sample BSP height independently.
- Hold LMB on an NPC/item/wild marker and drag across the 3D BSP to move it; terrain-relative Y offset is preserved.
- Recommended group leader mode is type=1 auto-attack.
- P/n/ii=5 scripted helpers are not generated by the generic group builder.

=== v0.8.21 — linked group battles from original sc_0611 ===
- Разобран оригинальный подтверждённый групповой бой sc_0611: ns3219 + ns321a.
- Script1 ns3219 содержит P.82.6eceda24; UID 0x6ECEDA24 принадлежит ns321a.
- Первый аргумент P расшифрован: 82 — индекс отдельного Trigger 82 с ii=5 в той же сцене, а не уровень и не номер противника.
- ns321a одновременно существует отдельным физическим Trigger 81: ii=3, ii2=3, со своей W-колодой.
- Новый Group Attack создаёт лидера и 1–4 support-профиля, у каждого собственная явная W-колода до 5 фей.
- Для каждого support создаётся физический NPC ii=3/ii2=3 и отдельный ii=5 marker; лидер получает P.<marker>.<supportUID>.
- Для группового лидера используется *.-1.1, как у оригинального ns3219.
- UI расширен до 2–5 противников. Оригиналом подтверждена схема для 2; 3–5 используют ту же структуру и требуют gameplay-проверки.
- Команда n для этого режима больше не используется.

=== v0.8.20 — group battles ===
- EXP suffix removed from the World Editor version name.
- Added a Group Attack constructor for 2 or 3 visible opponents.
- Every participant gets an independent cloned battle-ready profile and its own W.<fairy>.<slot>.<level> deck (up to 5 slots).
- The leader receives n.(N-1).L.1, where N is 2 or 3 and L is the highest level in the leader deck; followers are placed nearby without their own auto-attack radius.
- This exact combination of n + explicit W decks is intentionally marked for gameplay validation.
- Static scan of original _fb0x05 and both supplied mods found W slots only 0..4; no W slot >4 was found. Public game/mod documentation also describes larger enemy forces as multiple separate decks. Therefore v0.8.20 keeps the per-opponent deck limit at 5 rather than writing unverified slot 5+.


v0.8.20 — Group Battle crash fix / RE test
------------------------------------------
- Убрана несовместимая экспериментальная комбинация n.* + W.* из профиля лидера группы.
- Группа с собственными колодами создаётся как 2–3 отдельных battle-ready _CustomElf профиля.
- Лидер размещается как hostile Trigger type=1 с заданным радиусом.
- Остальные участники размещаются рядом как Trigger type=2.
- Цель теста: проверить, подтягивает ли движок соседние отдельные W-профили в один бой.
- Если сцена загружается, но в бой входит только лидер — это важный отрицательный результат: для точных отдельных колод потребуется дальнейший RE механизма n/боевого менеджера.
- Анализ оригинала и модов: n.* встречается без W.*; модовые профили с L.3.0 содержат три альтернативные W-колоды по 5 слотов, а не одну 15-слотовую колоду.
- Слоты W выше 4 не найдены; поддержку >5 фей в одной колоде пока не включаем.


=== v0.8.20 — deck variants + engine group ===
- EXP suffix remains removed.
- Added editing of 1–5 alternative fairy decks for one enemy using confirmed mod layout L.N.0 / $.i / W / K.N / $.N.
- v0.8.19 gameplay result: nearby physical W-NPCs do NOT automatically join one battle.
- Group constructor now follows the observed engine n-command architecture: one visible battle-ready profile, no W commands, n.1 or n.2 for 2/3 opponents.
- Exact per-opponent custom W decks in an n-group are still unresolved and are not faked.
- Research across original + supplied mods found no W slot above 4. Public gameplay docs also describe Fairy Masters as having up to five fairies. Global Mod reaches 6–25 enemy fairies via multiple decks/reinforcements, not by a >5 slot deck.


v0.8.26 GROUP TEST
------------------
Для первого теста создайте группу из 2 противников на sc_2421. В v0.8.26 профили НЕ клонируются целиком из ns3224/ns3225: battle lifecycle берётся из nq4001, а column 3/actor role — из ns3224 для лидера и ns3225 для support. Доступно 2–5 противников с отдельными W-командами. Сначала проверьте загрузку сцены; если она загрузилась — затем вход обоих противников в бой и их состояние после победы.


=== v0.8.26 — group actor-role fix ===
- Gameplay test of v0.8.24: adding a group still made sc_2421 fail to load.
- Direct comparison of nq4001 vs original group profiles showed that, outside Script1..5 and internal name, the only structural difference is column 3 (Name/actor reference).
- nq4001 actor ref: 0x97688F91.
- ns3224 leader actor ref: 0x0648ACA1.
- ns3225 support actor ref: 0xB18BDDB1.
- New group profiles are still based on the independently working nq4001 lifecycle, but their column 3 is transplanted from the exact original group role: ns3224 for leader, ns3225 for supports.
- Story/quest scripts from ns3224/ns3225 are NOT copied.
- Up to 5 opponents, separate C.<model> and W teams retained.
- 3D drag on BSP retained unchanged; user gameplay/UI test reports it works well.
- Static tests: JS syntax PASS; FBS serialize/parse PASS; sc_2421 two-member group structure parse PASS; actor-role roundtrip PASS.

GAMEPLAY STATUS
- v0.8.26 group combat is awaiting gameplay test.
- Do not treat this as confirmed until sc_2421 loads and the whole group enters/exits combat correctly.
