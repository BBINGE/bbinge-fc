# GOAT 선수 사진 감사 보고서

기준 파일: `bbinge_fc_goat_photo_targets_136.xlsx`

## 결과

- 확보 완료: 34명
- 미확보: 101명
- 라이선스 확인 필요: 1명
- 전체: 136명

`ready`는 원본 출처와 라이선스, 목표 전성기 구간, 허용 구단 또는 대표팀, 네 가지 반응형 구도를 모두 확인한 사진만 뜻한다. 기준을 하나라도 확정하지 못한 사진은 사이트에 연결하지 않았다.

## 확보 완료 선수

Arthur Friedenreich, Giuseppe Meazza, José Nasazzi, Puskás Ferenc, Kocsis Sándor, Pelé, Garrincha, Lev Yashin, Bobby Charlton, Bobby Moore, Just Fontaine, Francisco Gento, Luis Suárez Miramontes, Obdulio Varela, Albert Flórián, Bozsik József, Johan Cruyff, Johan Neeskens, Franz Beckenbauer, Gerd Müller, Paulo Roberto Falcão, Rivellino, Jairzinho, Diego Maradona, Kenny Dalglish, Hugo Sánchez, Enzo Francescoli, Elías Figueroa, Kaká, Javier Zanetti, Steven Gerrard, Marco van Basten, Robert Lewandowski, Zlatan Ibrahimović

## 라이선스 확인 필요

Hristo Stoichkov

Hristo Stoichkov 후보는 FC Barcelona 페이지의 저작권 표기만 확인되어 재사용 라이선스를 확정할 수 없다. 따라서 사이트에는 연결하지 않았다.

## 미확보 및 판별 보류

José Leandro Andrade, Ricardo Zamora, Matthias Sindelar, Leônidas da Silva, Stanley Matthews, Zizinho, Valentino Mazzola, Héctor Scarone, Alfredo Di Stéfano, Hidegkuti Nándor, Didi, Nílton Santos, Eusébio, Denis Law, George Best, Raymond Kopa, Omar Sívori, Juan Alberto Schiaffino, Josef Masopust, Uwe Seeler, Fritz Walter, Mário Zagallo, Mário Coluna, Jimmy Greaves, Tom Finney, John Charles, Karl-Heinz Rummenigge, Michel Platini, Zico, Sócrates, Carlos Alberto Torres, Daniel Passarella, Mario Kempes, Kevin Keegan, Gary Lineker, Paolo Rossi, Dino Zoff, Gaetano Scirea, Zbigniew Boniek, Oleh Blokhin, Bum-kun Cha, Michael Laudrup, Berti Vogts, Zinédine Zidane, Thierry Henry, Éric Cantona, Ronaldo, Ronaldinho, Rivaldo, Romário, Cafu, Roberto Carlos, Paolo Maldini, Franco Baresi, Alessandro Nesta, Fabio Cannavaro, Gianluigi Buffon, Francesco Totti, Roberto Baggio, Gabriel Batistuta, Juan Román Riquelme, Raúl González, Iker Casillas, Luís Figo, David Beckham, Paul Scholes, Dennis Bergkamp, Ruud Gullit, Lothar Matthäus, Oliver Kahn, Pavel Nedvěd, Andriy Shevchenko, George Weah, Didier Drogba, Samuel Eto'o, Xavi Hernández, Andrés Iniesta, Ji-sung Park, Frank Rijkaard, Ryan Giggs, Lilian Thuram, Alessandro Del Piero, Lionel Messi, Cristiano Ronaldo, Neymar, Kylian Mbappé, Luis Suárez, Luka Modrić, Toni Kroos, Sergio Ramos, Mohamed Salah, Virgil van Dijk, Kevin De Bruyne, Manuel Neuer, Thomas Müller, Karim Benzema, Andrea Pirlo, Heung-min Son, Min-jae Kim, Rodri, Dani Alves

미확보에는 전성기 연도 불일치, 촬영 연도 미상, 허용 구단 판별 불가, 은퇴 후·행사·시상식 구도, 얼굴이 너무 작거나 반응형 카드에서 잘리는 사진이 포함된다. 세부 판정과 원본 URL은 `src/data/player-photo-audit.json`의 각 선수 `notes`, `sourceVerification`, `review`에서 확인할 수 있다.

## 구현

- 통과 사진은 `public/images/goat/players/{player-id}.webp` 규칙으로 정리했다.
- 선수 데이터에서 desktop, laptop, tablet, mobile별 `photoPosition`과 `photoScale`을 읽는다.
- `?debugPhotoFocus=1`을 붙이면 카드에 현재 포커스 좌표와 배율을 표시한다.
- `?debugPhotoFocus=1&debugPlayers=pele,maradona`처럼 두 ID를 지정하면 검수 대상을 고정할 수 있다.
