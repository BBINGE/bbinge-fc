# GOAT 선수 사진 감사 보고서

기준 파일: `bbinge_fc_goat_photo_targets_136.xlsx`

## 결과

- 확보 완료: 8명
- 사용자 제공·화면 적용(출처 확인 대기): 67명
- 미확보: 60명
- 라이선스 확인 필요: 1명
- 전체: 136명

`ready`는 원본 출처와 라이선스, 목표 전성기 구간, 허용 구단 또는 대표팀, 네 가지 반응형 구도를 모두 확인한 사진만 뜻한다. 기준을 하나라도 확정하지 못한 사진은 사이트에 연결하지 않았다.

## 확보 완료 선수

Kenny Dalglish, Enzo Francescoli, Kaká, Javier Zanetti, Steven Gerrard, Marco van Basten, Robert Lewandowski, Zlatan Ibrahimović

## 라이선스 확인 필요

Hristo Stoichkov

Hristo Stoichkov 후보는 FC Barcelona 페이지의 저작권 표기만 확인되어 재사용 라이선스를 확정할 수 없다. 따라서 사이트에는 연결하지 않았다.

## 사용자 제공·화면 적용

Arthur Friedenreich, José Leandro Andrade, Ricardo Zamora, Giuseppe Meazza, Matthias Sindelar, Leônidas da Silva, Stanley Matthews, Zizinho, Valentino Mazzola, Héctor Scarone, José Nasazzi, Puskás Ferenc, Alfredo Di Stéfano, Kocsis Sándor, Hidegkuti Nándor, Pelé, Garrincha, Didi, Nílton Santos, Lev Yashin, Eusébio, Bobby Charlton, Bobby Moore, Denis Law, George Best, Raymond Kopa, Just Fontaine, Francisco Gento, Luis Suárez Miramontes, Omar Sívori, Juan Alberto Schiaffino, Obdulio Varela, Josef Masopust, Albert Flórián, Uwe Seeler, Fritz Walter, Bozsik József, Mário Zagallo, Mário Coluna, Jimmy Greaves, Tom Finney, John Charles, Johan Cruyff, Johan Neeskens, Franz Beckenbauer, Gerd Müller, Karl-Heinz Rummenigge, Michel Platini, Zico, Sócrates, Paulo Roberto Falcão, Rivellino, Jairzinho, Diego Maradona, Daniel Passarella, Mario Kempes, Kevin Keegan, Gary Lineker, Paolo Rossi, Dino Zoff, Gaetano Scirea, Zbigniew Boniek, Oleh Blokhin, Hugo Sánchez, Elías Figueroa, Bum-kun Cha, Michael Laudrup

사용자가 선수 시절 사진으로 직접 제공했고 반응형 구도를 확인해 시험 적용한 사진이다. 원본 출처 URL과 라이선스는 아직 확인되지 않았으므로 `ready`와 구분한다.

## 미확보 및 판별 보류

Carlos Alberto Torres, Berti Vogts, Zinédine Zidane, Thierry Henry, Éric Cantona, Ronaldo, Ronaldinho, Rivaldo, Romário, Cafu, Roberto Carlos, Paolo Maldini, Franco Baresi, Alessandro Nesta, Fabio Cannavaro, Gianluigi Buffon, Francesco Totti, Roberto Baggio, Gabriel Batistuta, Juan Román Riquelme, Raúl González, Iker Casillas, Luís Figo, David Beckham, Paul Scholes, Dennis Bergkamp, Ruud Gullit, Lothar Matthäus, Oliver Kahn, Pavel Nedvěd, Andriy Shevchenko, George Weah, Didier Drogba, Samuel Eto'o, Xavi Hernández, Andrés Iniesta, Ji-sung Park, Frank Rijkaard, Ryan Giggs, Lilian Thuram, Alessandro Del Piero, Lionel Messi, Cristiano Ronaldo, Neymar, Kylian Mbappé, Luis Suárez, Luka Modrić, Toni Kroos, Sergio Ramos, Mohamed Salah, Virgil van Dijk, Kevin De Bruyne, Manuel Neuer, Thomas Müller, Karim Benzema, Andrea Pirlo, Heung-min Son, Min-jae Kim, Rodri, Dani Alves

미확보에는 전성기 연도 불일치, 촬영 연도 미상, 허용 구단 판별 불가, 은퇴 후·행사·시상식 구도, 얼굴이 너무 작거나 반응형 카드에서 잘리는 사진이 포함된다. 세부 판정과 원본 URL은 `src/data/player-photo-audit.json`의 각 선수 `notes`, `sourceVerification`, `review`에서 확인할 수 있다.

## 구현

- 통과 사진은 `public/images/goat/players/{player-id}.webp` 규칙으로 정리했다.
- 선수 데이터에서 desktop, laptop, tablet, mobile별 `photoPosition`과 `photoScale`을 읽는다.
- `?debugPhotoFocus=1`을 붙이면 카드에 현재 포커스 좌표와 배율을 표시한다.
- `?debugPhotoFocus=1&debugPlayers=pele,maradona`처럼 두 ID를 지정하면 검수 대상을 고정할 수 있다.
