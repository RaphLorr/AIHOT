// RetailHOT 的 Jenkins 流水线。
//
// 流程：检出 → 打发布包（git archive，只含已提交的文件）→ 归档 →（勾选 DEPLOY 时）SSH 上传到服务器，
//       调用 retailhot-deploy，由它在服务器上用 Docker Compose 构建并重启。
//
// 这里不跑类型检查和测试：项目需要 Node.js 24，而这台 Jenkins 只配了 Node 22。
// 类型检查在本地跑（npm run typecheck）；网页的构建由服务器上的 docker build（Node 24 镜像）把关，失败时不会切换版本。
//
// Jenkins 任务配置：Pipeline script from SCM，分支 retailhot，Script Path 填 Jenkinsfile。
// 用到的插件：Pipeline、Git、Credentials Binding、Workspace Cleanup（和 Raphare 的任务一样，不需要 SSH Agent 插件）。
// 服务器端的一次性准备工作见 deploy/DEPLOY-JENKINS.md。

pipeline {
  agent any

  options {
    skipDefaultCheckout(true)
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '5'))
    timeout(time: 30, unit: 'MINUTES')
  }

  parameters {
    booleanParam(name: 'DEPLOY', defaultValue: true, description: '打包后部署到服务器（默认勾选；只想打包时取消勾选）')
    string(name: 'DEPLOY_HOST', defaultValue: '1.13.174.35', description: '服务器地址（默认是 ai_demo）。必须和 Jenkins 的 known_hosts 里记录的一致，所以填 IP，不要填 SSH 别名')
    string(name: 'DEPLOY_USER', defaultValue: 'deploy', description: 'SSH 用户，需要能免密 sudo 执行 /usr/local/sbin/retailhot-deploy')
    string(name: 'SSH_CREDENTIALS_ID', defaultValue: 'raphare-spike-ssh', description: 'Jenkins 凭据 ID，类型为 SSH Username with private key（沿用 Raphare 的部署凭据）')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout([
          $class: 'GitSCM',
          branches: scm.branches,
          userRemoteConfigs: scm.userRemoteConfigs,
          extensions: [
            [$class: 'CloneOption', shallow: true, depth: 1, noTags: true, timeout: 10],
            [$class: 'CleanBeforeCheckout']
          ]
        ])
        script {
          def sha = sh(returnStdout: true, script: 'git rev-parse --short=12 HEAD').trim()
          def stamp = sh(returnStdout: true, script: 'date +%Y%m%d%H%M%S').trim()
          env.RELEASE = "${stamp}-${sha}"
          currentBuild.displayName = "#${env.BUILD_NUMBER} ${env.RELEASE}"
        }
      }
    }

    stage('Package') {
      steps {
        // 发布包就是仓库里已提交的文件（Docker 构建上下文），不含 .env 和任何密钥。
        sh '''
          set -eu
          test -f industry/site.ts && test -f deploy/install.sh || { echo "仓库结构不对：缺少 industry/site.ts 或 deploy/install.sh"; exit 1; }
          rm -rf out && mkdir -p out
          PKG="retailhot-${RELEASE}.tar.gz"
          git archive --format=tar.gz -o "out/$PKG" HEAD
          (cd out && sha256sum "$PKG" > "$PKG.sha256")
          ls -l "out/$PKG"
        '''
        archiveArtifacts artifacts: 'out/*', fingerprint: true
      }
    }

    stage('Deploy') {
      when { expression { params.DEPLOY } }
      steps {
        script {
          if (!params.DEPLOY_HOST?.trim()) {
            error('勾选了 DEPLOY 时必须填写 DEPLOY_HOST')
          }
        }
        withCredentials([sshUserPrivateKey(credentialsId: params.SSH_CREDENTIALS_ID, keyFileVariable: 'SSH_KEY')]) {
          // 服务器的 host key 需要事先在 agent 的 known_hosts 里（Raphare 的任务已经配过），这里不自动信任未知主机。
          sh '''
            set -eu
            PKG="retailhot-${RELEASE}.tar.gz"
            SSH_OPTS="-o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes"
            scp -i "$SSH_KEY" $SSH_OPTS "out/$PKG" "out/$PKG.sha256" "${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/"
            ssh -i "$SSH_KEY" $SSH_OPTS "${DEPLOY_USER}@${DEPLOY_HOST}" \
              "sudo /usr/local/sbin/retailhot-deploy /tmp/$PKG ${RELEASE}"
          '''
        }
      }
    }
  }

  post {
    success {
      script {
        if (params.DEPLOY) {
          echo "已部署 ${env.RELEASE}。回滚：在服务器上执行 sudo retailhot-deploy --list，再执行 --rollback <版本>"
        }
      }
    }
    always {
      cleanWs(deleteDirs: true, notFailBuild: true)
    }
  }
}
