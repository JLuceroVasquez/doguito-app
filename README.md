![Doguito app](https://github.com/user-attachments/assets/5ef5e35d-d43f-493e-a2da-367f17503833)
<hr>

<p align="center">
  <img src="https://img.shields.io/badge/Estado-Finalizado-blue">
  <img src="https://img.shields.io/badge/Licencia-MIT License-orange">
</p>

### Índice
- [Descripción del Proyecto](#computer-descripción-del-proyecto)
- [Despliegue del Proyecto en OCI Resource Manager](#hammer-despliegue-del-proyecto-en-oci-resource-manager)
- [Manejo de Errores](#unlock-manejo-de-errores)
- [Tecnologías usadas](#briefcase-tecnologías-usadas)
- [Desarrollador](#bowtie-desarrollador)

## :computer: Descripción del proyecto
<p align="justify">
Este proyecto es una demostración práctica del enfoque Infraestructura como Código (IaC) para automatizar el aprovisionamiento y el despliegue de una aplicación backend Node.js en Oracle Cloud Infrastructure (OCI).
El objetivo principal es establecer y configurar automáticamente toda la infraestructura cloud y la aplicación de manera desatendida, garantizando un entorno reproducible y estable. La aplicación backend se conecta a una Oracle Autonomous Database (ADB) para la gestión de datos.
El foco principal de este repositorio es la automatización completa del ciclo de vida del despliegue:
  
:heavy_check_mark: `Infraestructura (Terraform):` Creación de la VCN, subredes, Gateway de Internet, lista de seguridad y una instancia de cómputo (VM) para alojar el servicio.

:heavy_check_mark: `Configuración (cloud-init):` Uso de metadatos para inyectar un script que instala dependencias (Node.js, Oracle Instant Client), clona el repositorio, configura la conexión a la base de datos (Wallet), y levanta la aplicación como un servicio systemd.

A continuación se presenta un **video demostrativo** del proyecto:

[![Video demo](https://img.youtube.com/vi/ZF_KGzpLvGQ/hqdefault.jpg)](https://www.youtube.com/watch?v=ZF_KGzpLvGQ)
</p>

## :hammer: Despliegue del Proyecto en OCI Resource Manager
El proyecto está diseñado para ser desplegado como una Pila (Stack) en el servicio Resource Manager (ORM) de OCI. Este servicio gestiona las configuraciones de Terraform de manera nativa.
<p align="center">
  <img src="https://github.com/user-attachments/assets/96e7d259-7009-4971-8f6e-efb3c041ff1a">
</p>

El proceso de despliegue se resume en los siguientes pasos:

1️⃣ `Creación del ZIP de Configuración:` Los código Terraform se encuentran comprimidos en el archivo ZIP **`doguito-site-orm2-master-final.zip`**. Se debe descargar y descomprimir el archivo ZIP para unas modificaciones.

2️⃣ `Configuración de Variables:` Complete los datos para la conexión con la BD en el archivo **doguito-site.service** (como db_user, db_password, connect_string). Asimismo, complete las URL para descargar el *Wallet* y el *doguito-site.service* en el script de **cloud-init.yaml**. Luego de las modificaciones, se deben comprimir los códigos terraform.

3️⃣ `Carga del Archivo en Resource Manager:` Primero, en la Consola de OCI, navegue a **Developer Services** (Servicios de Desarrollador) y seleccione **Resource Manager**. Segundo, haga clic en **Pilas** y luego en **Crear Pila** (Create Stack). Tercero, seleccione la opción **"Archivo Zip"** (.zip) y suba el archivo **`doguito-site-orm2-master-final.zip`** con las modificaciones del paso anterior. Cuarto, añadir la **clave pública SSH** creada previamente en el cloudshell.

4️⃣ `Ejecución del Plan:` Una vez creada la pila, ejecute el **Plan** para previsualizar los recursos a crear, y luego ejecute **Aplicar** (Apply) para iniciar el aprovisionamiento.

## :unlock: Manejo de Errores
En un despliegue IaC, los errores post-aprovisionamiento ocurren generalmente en la etapa de configuración de la VM (cloud-init). Es crucial saber cómo diagnosticar estos fallos:

1️⃣ `Conexión SSH a la Instancia:` Una vez que la instancia de cómputo (VM) se encuentre en estado "Running" (Activa), conéctese a ella utilizando SSH:

    ssh -i .ssh/cloudshellkey opc@ip

2️⃣ `Examen de Logs de cloud-init:` Ejecute el siguiente comando para ver el output completo y cronológico de cada comando ejecutado por el script cloud-init.yaml:

    sudo cat /var/log/cloud-init-output.log

El archivo de logs de cloud-init es la herramienta principal de debugging. Tras identificar los mensajes de error, se puede pedir a un LLM que ayude a resolverlos.

## :briefcase: Tecnologías usadas
- Terraform
- Oracle Cloud Infrastructure (OCI), Resource Manager (ORM)
- cloud-init, Bash
- Node.js, Módulo oracledb, Express.js
- Oracle Autonomous Database (ADB) v.19c
- Máquinas virtuales Standard.A1.Flex Oracle Linux 9 (OL9) ARM64 

## :bowtie: Desarrollador
|[<img src="https://avatars.githubusercontent.com/u/176303607?v=4" width=115> <br> <sub>Jimmy Octavio Lucero Vasquez</sub>](https://github.com/JLuceroVasquez)|
|:---:|
