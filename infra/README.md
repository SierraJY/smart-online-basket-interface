# AIoT 스마트바스켓 EC2 인프라 구조

## 서버 구성 개요

| 항목 | 내용 |
|---|---|
| 서버 | AWS EC2 |
| 운영체제 | Ubuntu 22.04 |
| 접속 방식 | SSH 접속 (공유 PEM 키) |
| 주요 작업 | Docker 실행, Git 커밋, 서비스 운영 |

---

## Docker 환경

- EC2에 Docker 및 docker-compose 설치 완료
- 각 계정에서 `sudo` 없이 Docker 사용 가능하도록 `docker` 그룹 권한 부여

```bash
sudo usermod -aG docker [계정명]
```

---

## 계정 구조 및 작업 방식

| 항목 | 내용 |
|---|---|
| 계정 관리 목적 | Git 커밋 작성자 구분용 계정 분리 |
| 계정별 Git 설정 | 각자 `git config --global` 로 이름/이메일 다르게 설정 |
| SSH 접속 방식 | 동일한 PEM 키 사용, 계정명으로 구분하여 접속 |
| 접속 예시 | `ssh -i 키.pem [계정명]@서버주소` |

---

## 디렉토리 구조

| 경로 | 설명 |
|---|---|
| /home/[계정명]/ | 각자 홈 디렉토리 |
| /home/[계정명]/S13P11B103 | 프로젝트 폴더 (공통) |
| /home/[계정명]/.vscode-server/ | VSCode Remote-SSH 서버 설치 경로 |

---

## 보안 및 관리

| 항목 | 설명 |
|---|---|
| 비밀번호 로그인 | 비활성화 (SSH PEM 키만 사용) |
| .vscode-server 캐시 | 계정별 개별 설치로 충돌 방지 |
| Docker 실행 | 계정별 독립 실행 가능 |

---

## 정리

- Docker + 계정별 Git 커밋 구분을 위한 계정 다중 생성
- 각자 계정으로 접속 후 Git & Docker 작업 진행

---

## 주의 사항

- 키 파일(.pem)은 **외부 공유 금지**
- 계정명은 README에 기록하지 않음
- `.ssh/config`는 각자 로컬에서 관리
