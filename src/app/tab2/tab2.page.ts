import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, LoadingController, AlertController, IonButton, IonModal, IonItem, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '../explore-container/explore-container.component';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { AngularFireStorage } from "@angular/fire/compat/storage";
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { getDownloadURL } from 'firebase/storage';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, ExploreContainerComponent, NgFor, NgIf, IonModal, IonButton, IonItem, IonSelect, IonSelectOption, FormsModule],
})
export class Tab2Page {
  //DB
  url_rondas = "SERVICIO_1/RONDAS"
  url_tareas = "SERVICIO_1/TAREAS"

  //USER
  label_1 = "Operario 1"
  user_id_1 = "85646778546"

  //RONDA
  id_ronda = "";
  turnoSeleccionado:any = "";
  turnos:any = [];
  puntos:any = []
  puntoAbierto:any = null;
  tareas:any = [];
  
  constructor(
    private loadingCtrl: LoadingController,
    private afs : AngularFireDatabase,
    private alert : AlertController,
    private fsStorage: AngularFireStorage
  ) {}

  ionViewWillEnter() {
    this.afs.database.ref(this.url_rondas).get().then(async(res) => {
      

      this.turnoSeleccionado = {
        inicio: res.val()?.Ronda_Desde,
        fin: res.val()?.Ronda_Hasta
      }

    });

    this.afs.database.ref(this.url_tareas).get().then(async(res) => {
      
      let tareas = res.val()
      this.tareas = [];

      Object.keys(tareas)?.forEach((key, index) => {
        
        this.tareas.push({
          tarea: key,
          indicaciones: tareas[key],
          open: false
        })

      });

      console.log(this.tareas)

    });


  }

  abrirDetallesPunto = (index:any) => {
    this.puntoAbierto = this.puntoAbierto == index ? null : index
  }

  takePicture = async (item:any, i:any) => {
    const image:any = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera
    });

    const loading = await this.loadingCtrl.create({
      message: 'Espere...',
      cssClass: 'custom-loading',
    });
    loading.present();
    
    this.fsStorage.ref(`captura_foto_${this.id_ronda}_${i}.png`).putString(image.base64String, 'base64').then((snapshot) => {
      getDownloadURL(snapshot.ref).then((downloadURL:any) => {
        loading.dismiss();
        this.puntos[i].foto = downloadURL
      })
    }); 
  };

}
