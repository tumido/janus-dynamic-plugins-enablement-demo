Enablement session for dynamic plugins in Backstage

1. Install RHDH helm chart:

  1. Go to: OCP console -> Developer perspective -> Helm -> Create -> Helm release -> Red Hat Developer Hub -> Create
  2. Then switch to YAML view
  3. Paste the following YAML (replace `clusterRouterBase` with your cluster base)
     <details><summary>EXPAND ME</summary>

      ```yaml
      global:
        auth:
          backend:
            enabled: true
            existingSecret: ''
            value: ''
        clusterRouterBase: CHANGE_ME
        dynamic:
          includes:
            - dynamic-plugins.default.yaml
          plugins: []
        host: ''
      route:
        annotations: {}
        enabled: true
        host: '{{ .Values.global.host }}'
        path: /
        tls:
          caCertificate: ''
          certificate: ''
          destinationCACertificate: ''
          enabled: true
          insecureEdgeTerminationPolicy: Redirect
          key: ''
          termination: edge
        wildcardPolicy: None
      upstream:
        backstage:
          appConfig:
            app:
              baseUrl: 'https://{{- include "janus-idp.hostname" . }}'
            backend:
              auth:
                keys:
                  - secret: '${BACKEND_SECRET}'
              baseUrl: 'https://{{- include "janus-idp.hostname" . }}'
              cors:
                origin: 'https://{{- include "janus-idp.hostname" . }}'
              database:
                connection:
                  password: '${POSTGRESQL_ADMIN_PASSWORD}'
                  user: postgres
            catalog:
              locations:
                - target: >-
                    https://github.com/janus-idp/backstage-showcase/blob/main/catalog-entities/all.yaml
                  type: url
          args:
            - '--config'
            - dynamic-plugins-root/app-config.dynamic-plugins.yaml
          command: []
          extraEnvVars:
            - name: BACKEND_SECRET
              valueFrom:
                secretKeyRef:
                  key: backend-secret
                  name: '{{ include "janus-idp.backend-secret-name" $ }}'
            - name: POSTGRESQL_ADMIN_PASSWORD
              valueFrom:
                secretKeyRef:
                  key: postgres-password
                  name: '{{- include "janus-idp.postgresql.secretName" . }}'
          extraVolumeMounts:
            - mountPath: /opt/app-root/src/dynamic-plugins-root
              name: dynamic-plugins-root
          extraVolumes:
            - ephemeral:
                volumeClaimTemplate:
                  spec:
                    accessModes:
                      - ReadWriteOnce
                    resources:
                      requests:
                        storage: 1Gi
              name: dynamic-plugins-root
            - configMap:
                defaultMode: 420
                name: dynamic-plugins
                optional: true
              name: dynamic-plugins
            - name: dynamic-plugins-npmrc
              secret:
                defaultMode: 420
                optional: true
                secretName: dynamic-plugins-npmrc
          image:
            pullSecrets: []
            registry: registry.redhat.io
            repository: rhdh/rhdh-hub-rhel9
            tag: 1.0-200
          initContainers:
            - command:
                - ./install-dynamic-plugins.sh
                - /dynamic-plugins-root
              env:
                - name: NPM_CONFIG_USERCONFIG
                  value: /opt/app-root/src/.npmrc.dynamic-plugins
              image: '{{ include "backstage.image" . }}'
              imagePullPolicy: Always
              name: install-dynamic-plugins
              volumeMounts:
                - mountPath: /dynamic-plugins-root
                  name: dynamic-plugins-root
                - mountPath: /opt/app-root/src/dynamic-plugins.yaml
                  name: dynamic-plugins
                  readOnly: true
                  subPath: dynamic-plugins.yaml
                - mountPath: /opt/app-root/src/.npmrc.dynamic-plugins
                  name: dynamic-plugins-npmrc
                  readOnly: true
                  subPath: .npmrc
              workingDir: /opt/app-root/src
          installDir: /opt/app-root/src
          livenessProbe:
            failureThreshold: 3
            httpGet:
              path: /healthcheck
              port: 7007
              scheme: HTTP
            initialDelaySeconds: 60
            periodSeconds: 10
            successThreshold: 1
            timeoutSeconds: 2
          podAnnotations:
            checksum/dynamic-plugins: >-
              {{- include "common.tplvalues.render" ( dict "value"
              .Values.global.dynamic "context" $) | sha256sum }}
          readinessProbe:
            failureThreshold: 3
            httpGet:
              path: /healthcheck
              port: 7007
              scheme: HTTP
            initialDelaySeconds: 30
            periodSeconds: 10
            successThreshold: 2
            timeoutSeconds: 2
        ingress:
          host: '{{ .Values.global.host }}'
        nameOverride: developer-hub
        postgresql:
          auth:
            secretKeys:
              adminPasswordKey: postgres-password
              userPasswordKey: password
          enabled: true
          image:
            registry: registry.redhat.io
            repository: rhel9/postgresql-15
            tag: latest
          postgresqlDataDir: /var/lib/pgsql/data/userdata
          primary:
            containerSecurityContext:
              enabled: false
            extraEnvVars:
              - name: POSTGRESQL_ADMIN_PASSWORD
                valueFrom:
                  secretKeyRef:
                    key: postgres-password
                    name: '{{- include "postgresql.v1.secretName" . }}'
            persistence:
              enabled: true
              mountPath: /var/lib/pgsql/data
              size: 1Gi
            podSecurityContext:
              enabled: false
      ```

     </details>

  4. And click `Create`.

2. Create a new plugin

First we will create a brand new plugin. Please create a NPM account and log in to it. Set `NPM_ACCOUNT` to this name.



```bash
NPM_ACCOUNT=tumido
DEMO_DIR=$(pwd)
cd $(mktemp -d)

npx @backstage/cli@latest new --scope @$NPM_ACCOUNT --select backend-plugin --option id=demo
cd backstage-plugin-demo-backend
code .
```

3. Update with demo sources

```bash
md src/dynamic
cp $DEMO_DIR/src/dynamic/index.ts src/dynamic/index.ts
cp $DEMO_DIR/app-config.yaml .
echo "export * from './dynamic/index';" >> src/index.ts
npm pkg delete "private"
yarn add @backstage/backend-plugin-manager@npm:@janus-idp/backend-plugin-manager@v1.19.6
```

4. Set up as dynamic plugin

This follows steps at [Janus Showcase Dynamic plugins docs](https://github.com/janus-idp/backstage-showcase/blob/main/showcase-docs/dynamic-plugins.md#frontend-plugins).

```bash
yarn add -D @janus-idp/cli
npm pkg set "files[1]"="dist-dynamic/*.*"
npm pkg set "files[2]"="dist-dynamic/dist/**"
npm pkg set "files[3]"="dist-dynamic/alpha/*"
npm pkg set "scripts.export-dynamic"="janus-cli package export-dynamic-plugin"
```

5. Build and publish

```bash
yarn tsc
yarn build
yarn export-dynamic
yarn publish
npm info @$NPM_ACCOUNT/plugin-demo-backend
```

6. Configure in helm chart

Please replace `$NPM_ACCOUNT` with your NPM account name.

```yaml
    plugins:
      - integrity: 
        package: '@$NPM_ACCOUNT/plugin-demo@0.1.0'
        pluginConfig:
          dynamicPlugins:
            frontend:
              $NPM_ACCOUNT.plugin-demo:
                appIcons:
                  - name: demoIcon
                    importName: DemoIcon
                dynamicRoutes:
                  - importName: DemoPage
                    menuItem:
                      icon: demoIcon
                      text: This is Demo
                    path: /demo
                mountPoints:
                  - mountPoint: entity.page.overview/cards
                    importName: demoEntityCard
                    config:
                      layout:
                        gridColumnEnd:
                          lg: "span 4"
                          md: "span 6"
                          xs: "span 12"
```
